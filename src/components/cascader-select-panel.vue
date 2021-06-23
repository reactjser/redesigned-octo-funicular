<template>
    <div class="um-cascade-select">
        <div class="um-cascade-select__container">
            <div class="um-cascade-select__part um-cascade-select__part--left">
                <el-input
                    v-model="leftSearchValue"
                    type="text"
                    size="small"
                    class="um-cascade-select__search-input"
                    :placeholder="leftSearchPlaceholder"
                    @input="handleLeftSearchValueInput" />
                <el-scrollbar wrap-class="um-cascade-select__left-list">
                    <li
                        :class="[
                            'um-cascade-select__item',
                            single
                                ? 'um-cascade-select__item--single-all'
                                : 'um-cascade-select__item--multi-all',
                            currentPId === ALL && 'um-cascade-select__item--active'
                        ]"
                        @click="handleLeftNodeClicked()">
                        全部
                    </li>
                    <li
                        v-for="item in slicePNodes"
                        :key="item.id"
                        :class="[
                            'um-cascade-select__item',
                            item.id === currentPId && 'um-cascade-select__item--active'
                        ]"
                        @click="handleLeftNodeClicked(item)">
                        <el-checkbox
                            v-if="!single"
                            class="um-cascade-select__checkbox um-cascade-select__checkbox--left"
                            :value="item.status"
                            true-label="all"
                            false-label="off"
                            :indeterminate="item.status === 'part'"
                            :disabled="item.disabled"
                            @change="handleLeftCheckboxChanged(item)"
                            @click.native.stop />
                            <span class="um-cascade-select__item-text">
                                <slot :item="item">
                                    {{item.label || emptyText}}
                                </slot>
                            </span>
                    </li>
                </el-scrollbar>
            </div>
            <div class="um-cascade-select__part um-cascade-select__part--right">
                <div class="um-cascade-select__title">
                    <span class="um-cascade-select__title-text">{{currentP.label}}</span>
                    <el-link v-if="!single" class="um-cascade-select__check-all-btn" @click="checkAll">
                        全选
                    </el-link>
                    <el-link class="um-cascade-select__reset-btn" @click="reset">
                        重置
                    </el-link>
                </div>
                <el-input
                    v-model="rightSearchValue"
                    type="text"
                    size="small"
                    class="um-cascade-select__search-input"
                    :placeholder="rightSearchPlaceholder"
                    @input="handleRightInput"
                    @keyup.enter.native="handleRightInput"
                />
                <el-scrollbar
                    v-show="currentP"
                    ref="rightScroll"
                    tag="div"
                    :wrap-class="[
                        'um-cascade-select__right-list',
                        sliceSubs.length === 0 && 'um-cascade-select__right-list--empty',
                        (rightLoading || !searchFlag) && 'um-cascade-select__right-list--loading'
                    ]">
                    <slot v-if="!rightLoading && currentPId === ALL && isAsyncSearch && !isSearchAllLoaded" name="right-searchAll"></slot>
                    <slot v-else-if="!rightLoading && currentPId === ALL && isAsyncSearch && searchFlag && isSearchAllLoaded && sliceSubs.length === 0" name="right-searchAll-empty"></slot>
                    <slot v-else-if="rightLoading || !searchFlag" name="right-loading"><i class="el-icon-loading"></i>加载中...</slot>
                    <ul v-else-if="!rightLoading && sliceSubs.length > 0">
                        <li
                            v-for="item in sliceSubs"
                            :key="item.id"
                            class="um-cascade-select__item">
                            <el-checkbox
                                v-if="!single"
                                class="um-cascade-select__checkbox um-cascade-select__checkbox--right"
                                :value="item.selected"
                                :disabled="item.disabled"
                                @change="handleRightCheckboxChanged(item)">
                                <slot :item="item">
                                    {{item.label || emptyText}}
                                </slot>
                            </el-checkbox>
                            <el-radio
                                v-else
                                class="um-cascade-select__radio"
                                :value="item.selected"
                                :label="true"
                                :disabled="item.disabled"
                                @change="handleRightCheckboxChanged(item, true)">
                                <slot :item="item">
                                    {{item.label || emptyText}}
                                </slot>
                            </el-radio>
                        </li>
                    </ul>
                    <slot v-else name="right-empty">暂无数据</slot>
                </el-scrollbar>
            </div>
        </div>
    </div>
</template>

<script>
import throttle from 'lodash/throttle';
import {NodeTree} from './select-node';
import mixin from './mixin';

export * from './utils.js';

const ALL = -1;

/**
 * 两列级联多选框，不包含弹窗功能。
 * ![um-cascade-select](http://file.gsxservice.com/165232910_zm2b8gc2.jpeg)
 */
export default {
    name: 'UmCascadeSelectPanel',
    mixins: [mixin],
    data() {
        this.ALL = ALL;
        this.inputSearchTimer = null;
        return {
            currentPId: void 0,
            leftSearchValue: '',
            rightSearchValue: '',
            nodeTree: new NodeTree(this),
            noUpdate: false,
            searchFlag: true,
            lSliceRange: [0, 150],
            rSliceRange: [0, 150],
            lScrollWrap: null,
            rScrollWrap: null,
            lScrollEvent: null,
            rScrollEvent: null,
            isSearchAllLoaded: false,
            // sliceRange: [0, 150],
            // scrollWrap: null,
            // scrollEvent: null,
        };
    },
    computed: {
        filteredPNodes() {
            return this.nodeTree.pNodes.filter(({label}) => label
                && label.toLowerCase().indexOf(this.leftSearchValue.trim().toLowerCase()) > -1);
        },
        slicePNodes() {
            return this.filteredPNodes.slice(this.lSliceRange[0], this.lSliceRange[1]);
        },
        currentP() {
            const {currentPId} = this;
            const list = this.nodeTree.pNodes;
            if (currentPId === void 0 || list.length === 0) {
                return {};
            }
            if (currentPId === ALL) {
                return {
                    label: '全部',
                    children: this.nodeTree.pNodes.reduce((prev, curr) => prev.concat(curr.children), [])
                };
            }
            return list.find(i => i.id === currentPId) || {};
        },
        currentSubs() {
            if (!this.searchFlag) {
                return [];
            }
            const {children: allChildren} = this.currentP || {};
            if (!allChildren) {
                return [];
            }
            const serachLowerText = this.rightSearchValue.trim().toLowerCase();
            if (serachLowerText.length !== 0) {
                return allChildren.filter(i => i.label
                    && i.label.toLowerCase().indexOf(serachLowerText) > -1);
            }
            // 所有的子节点默认为空
            return this.currentPId === ALL ? [] : allChildren;
        },
        sliceSubs() {
            return this.currentSubs.slice(this.rSliceRange[0], this.rSliceRange[1]);
        },
    },
    watch: {
        value(newValue) {
            if (this.noUpdate) {
                this.noUpdate = false;
                return;
            }
            const computedValue = this.single && !Array.isArray(newValue) ? [newValue] : newValue;
            this.nodeTree.watchValue(computedValue);
            // this.handleDefaultSelectAll(computedValue);
        },
        options: {
            handler(value) {
                if (!this.useExistCurrentPId) {
                    this.currentPId = value && value.length > 0 && value[0].id;
                }
                this.initTreeData(value);
                const computedValue = this.single && !Array.isArray(this.value) ? [this.value] : this.value;
                this.nodeTree.watchValue(computedValue);
                // this.handleDefaultSelectAll(computedValue);
                this.$nextTick(()=> {
                    this.initScrollEvent();
                });
            },
            deep: true
        },
    },
    mounted() {
        this.currentPId = this.options && this.options.length > 0 && this.options[0].id;
        this.initTreeData(this.options);
        const computedValue = this.single && !Array.isArray(this.value) ? 
            (!this.value && this.value !== 0 ? [] : [this.value]) : this.value;
        this.nodeTree.watchValue(computedValue);
        this.handleDefaultSelectAll(computedValue);
        this.rScrollWrap = this.$el.querySelector('.um-cascade-select__right-list');
        this.lScrollWrap = this.$el.querySelector('.um-cascade-select__left-list');
        this.initScrollEvent();
    },
    methods: {
        handleDefaultSelectAll(computedValue) {
            if (this.isDefaultSelectAll && computedValue.length === 0) {
                this.currentPId = ALL;
            }
        },
        initTreeData(options) {
            this.nodeTree = new NodeTree(this, options, this.value, this.single);
        },
        initLeftSliceRange() {
            this.lSliceRange = [0, 150];
        },
        initScrollEvent() {
            this.bindScrollEvent(
                'r',
                this.currentSubs.length,
            );
            this.bindScrollEvent(
                'l',
                this.filteredPNodes.length,
            );
        },
        emitSelect(value) {
            if (this.single) {
                this.$emit('select', value[0]);
            }
            else {
                this.$emit('select', value);
            }
        },
        handleLeftNodeClicked(pNode) {
            this.rightSearchValue = '';
            // const scrollWrap = this.$el.querySelector('.um-cascade-select__right-list');
            if (!pNode) {
                this.currentPId = ALL;
                this.$emit('node-all-click', pNode);
                return;
            }
            this.currentPId = pNode.id;
            pNode.sortCNodes();
            this.rSliceRange = [0, 150];
            this.$nextTick(() => {
                this.rScrollWrap.scrollTop = 0;
            });
            this.bindScrollEvent(
                'r',
                this.currentSubs.length,
            );
            this.isSearchAllLoaded = false;
            this.$emit('node-click', pNode);
        },
        handleLeftCheckboxChanged(pNode) {
            this.noUpdate = true;
            const newValue = this.nodeTree.switchLeftNode(pNode);
            this.currentPId = pNode.id;
            this.emitSelect(newValue);
            this.$emit('check-change', pNode);
            this.$emit('node-click', pNode);
        },
        handleRightCheckboxChanged(sub) {
            this.noUpdate = true;
            const newValue = this.nodeTree.switchRightNode(sub);
            this.emitSelect(newValue);
            this.$emit('check-change', sub);
            this.$emit('node-click', sub);
        },
        bindScrollEvent(pos, maxCount) {
            if (maxCount > 150) {
                if (this[`${pos}ScrollEvent`]) {
                    return;
                }
                this[`${pos}ScrollEvent`] = throttle(() => {
                    this.changeSliceRange(pos, this[`${pos}ScrollWrap`], maxCount);
                }, 50);
                this[`${pos}ScrollWrap`].addEventListener('scroll', this[`${pos}ScrollEvent`]);
            }
            else if (this[`${pos}ScrollEvent`]) {
                this[`${pos}ScrollWrap`].removeEventListener('scroll', this[`${pos}ScrollEvent`]);
                this[`${pos}ScrollEvent`] = null;
            }
        },
        changeSliceRange(pos, scrollTarget, max) {
            const top = scrollTarget.scrollTop;
            const height = scrollTarget.scrollHeight;
            const BASE = 50;
            if (top < 30 * 25 && this[`${pos}SliceRange`][0] !== 0) {
                let b = BASE;
                if (this[`${pos}SliceRange`][0] < BASE) {
                    b = this[`${pos}SliceRange`][0];
                }
                this.$set(this[`${pos}SliceRange`], 0, this[`${pos}SliceRange`][0] - b);
                this.$set(this[`${pos}SliceRange`], 1, this[`${pos}SliceRange`][1] - b);
            }
            else if (top > 100 * 25 && this[`${pos}SliceRange`][1] < max) {
                let b = BASE;
                if (max - this[`${pos}SliceRange`][1] < BASE) {
                    b = max - this[`${pos}SliceRange`][1];
                }
                this.$set(this[`${pos}SliceRange`], 0, this[`${pos}SliceRange`][0] + b);
                this.$set(this[`${pos}SliceRange`], 1, this[`${pos}SliceRange`][1] + b);
                scrollTarget.scrollTop -= b * 25;
            }
        },
        handleLeftSearchValueInput() {
            if (this.isAsyncLeftNode && this.sliceSubs.length === 0) {
                this.currentPId = ALL;
            }
            else {
                this.currentPId = this.filteredPNodes[0]
                    ? this.filteredPNodes[0].id
                    : void 0;
            }
        },
        handleRightInput() {
            if (this.isAsyncSearch && this.currentPId === ALL) {
                this.asyncSearch();
            }
            else {
                this.localSearch();
            }
        },
        asyncSearch() {
            if (this.inputSearchTimer) {
                clearTimeout(this.inputSearchTimer);
            }
            this.searchFlag = false;
            this.inputSearchTimer = setTimeout(() => {
                this.searchFlag = true;
                this.$emit('async-search', this.rightSearchValue, () => {
                    this.isSearchAllLoaded = true;
                    this.rSliceRange = [0, 150];
                });
            }, 1000);
        },
        localSearch() {
            if (this.inputSearchTimer) {
                clearTimeout(this.inputSearchTimer);
            }
            this.searchFlag = false;
            this.inputSearchTimer = setTimeout(() => {
                this.searchFlag = true;
                this.rSliceRange = [0, 150];
            }, 1000);
        },
        checkAll() {
            if (this.single) {
                return;
            }
            let val = this.value;
            if (!Array.isArray(this.value)) {
                val = [];
            }
            const idsShouldSelect = [];
            this.currentSubs.forEach(subNode => {
                if (!val.includes(subNode.id) && !subNode.disabled) {
                    idsShouldSelect.push(subNode.id);
                }
            });
            this.emitSelect(val.concat(idsShouldSelect));
        },
        reset() {
            this.rightSearchValue = '';
            this.emitSelect([]);
        },
        getCheckedNodes() {
            return this.nodeTree.getCheckedNodes();
        },
        clearLostValue() {
            const newValue = this.nodeTree.clearLostValue();
            this.emitSelect(newValue);
        },
        changeCurrentSelection(id) {
            if (id) {
                this.currentPId = id;
                return;
            }
            const firstSelectedNode = this.nodeTree.pNodes.find(pNode =>
                pNode.status === 'part' || pNode.status === 'all');
            if (firstSelectedNode) {
                this.currentPId = firstSelectedNode.id;
            }
        },
    }
};
</script>
