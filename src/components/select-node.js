import * as utils from './utils';

class Node {
    constructor(data) {
        const {id, label, disabled, ...rest} = data;
        this.id = id;
        this.label = label;
        this.disabled = disabled || false;
        // 保证不遗漏业务方传来的其它字段，pNode和cNode会覆盖部分字段
        for (let key in rest) {
            this[key] = rest[key];
        }
    }

    switch() {
        throw new Error(`${this} should hava a method named [switch]`);
    }
}

export class CNode extends Node {
    constructor(data, parent, single = false) {
        super(data);
        this.parent = parent;
        this.selected = data.selected || false;
        this.single = single;
        if (data.selected) {
            parent.checkedChildrenLen += 1;
        }
        if (data.disabled) {
            parent.disabledChildrenLen += 1;
        }
    }

    syncSelect(selected) {
        // 右侧节点是disabled && 这次同步还是选中状态
        // 则push到disabledValue中
        if (this.disabled && selected) {
            this.parent.tree.disabledValue.push(this.id);
        }
        this.selected = selected;
    }

    // 只计算value，不修改状态
    switch(nodeSelected) {
        const {tree} = this.parent;
        if (this.single) {
            tree.allChildrenNode.forEach(node => {
                if (node.selected) {
                    node.selected = false;
                    node.parent.status = 'off';
                }
            });
            this.selected = true;
            tree.value = [this.id];
            this.parent.status = 'part';
            return;
        }
        if (this.disabled) {
            return;
        }
        if (nodeSelected === false || nodeSelected === true) {
            this.updateSelectToData(nodeSelected);
            return;
        }
        this.updateSelectToData(!this.selected);
    }

    updateSelectToData(selectStatus) {
        const {tree} = this.parent;
        if (selectStatus) {
            if (!tree.value.includes(this.id)) {
                tree.value.push(this.id);
                this.parent.checkedChildrenLen += 1;
            }
        }
        else {
            const i = tree.value.findIndex(id => this.id === id);
            if (i > -1) {
                this.parent.checkedChildrenLen -= 1;
                tree.value.splice(i, 1);
            }
        }
        this.selected = selectStatus;
        this.changePNodeStatus();
    }

    changePNodeStatus() {
        const {parent: {children, checkedChildrenLen, disabledChildrenLen}} = this;
        const childrenLen = children.length;
        if (childrenLen === checkedChildrenLen + disabledChildrenLen) {
            this.parent.status = 'all';
        }
        else if (checkedChildrenLen > 0) {
            this.parent.status = 'part';
        }
        else {
            this.parent.status = 'off';
        }
    }
}

export class PNode extends Node {
    constructor(data, tree, single) {
        super(data);
        const {children, status = 'off'} = data;
        this.checkedChildrenLen = 0;
        this.disabledChildrenLen = 0;
        this.status = status;
        this.tree = tree;
        this.children = [];
        this.single = single;
        if (children) {
            for (let i = 0, l = children.length; i < l; ++i) {
                const cNode = new CNode(children[i], this, single);
                this.children.push(cNode);
                this.tree.allChildrenNode.push(cNode);
            }
        }
    }

    // 只计算value 不改变节点状态
    switch() {
        if (this.disabled) {
            return;
        }
        const {status, tree} = this;
        const values = [];
        for (let i = 0, l = this.children.length; i < l; ++i) {
            const cNode = this.children[i];
            if (status === 'all') {
                if (!cNode.selected) {
                    continue;
                }
                cNode.syncSelect(false);
            }
            else {
                if (cNode.selected) {
                    continue;
                }
                cNode.syncSelect(true);
            }
            if (!cNode.disabled) {
                values.push(cNode.id);
            }
        }
        if (status === 'all') {
            this.status = 'off';
            tree.value = tree.value.filter(id => values.indexOf(id) === -1);
            this.checkedChildrenLen = tree.value.length;
        }
        else {
            this.status = 'all';
            this.checkedChildrenLen += values.length;
            tree.value = [...tree.value, ...values];
        }
    }

    syncStatus(allIds) {
        this.children.forEach(cNode => {
            if (this.disabled) {
                cNode.disabled = true;
            }
            if (allIds.includes(cNode.id)) {
                cNode.syncSelect(true);
            }
            else {
                cNode.syncSelect(false);
            }
        });
        const notDisabledChildren = this.children.filter(cNode => !cNode.disabled);
        if (utils.isEveryChildUnselect(this.children, allIds)
            || utils.isEveryChildUnselect(notDisabledChildren, allIds)
        ) {
            this.status = 'off';
        }
        else if (utils.isEveryChildSelect(this.children, allIds)
            || utils.isEveryChildSelect(notDisabledChildren, allIds)
        ) {
            this.status = 'all';
        } else {
            this.status = 'part';
        }
    }

    sortCNodes() {
        if (this.status === 'off') {
            return;
        }
        this.children.sort((a, b) => {
            if (a.selected && !b.selected) {
                return -1;
            }
            if (a.selected && b.selected) {
                return 0;
            }
            if (!a.selected && b.selected) {
                return 1;
            }
            if (!a.selected && !b.selected) {
                return a.id - b.id;
            }
        });
    }
}

export class NodeTree {
    constructor(vm, treeOption = [], value = [], single) {
        this.container = vm;
        this.allChildIds = [];
        this.allChildrenNode = [];
        this.value = value;
        this.disabledValue = [];
        this.lostValue = [];
        this.single = single;
        this.pNodes = treeOption.map(pNodeData => {
            this.allChildIds = this.allChildIds.concat(pNodeData.children.map(({id}) => id));
            return new PNode(pNodeData, this, single);
        });
    }

    watchValue(value = []) {
        this.value = value;
        this.disabledValue = [];
        this.pNodes.forEach(pNode => {
            pNode.syncStatus(value);
        });
        this.emitLostValue();
        this.disabledValue.length > 0 && this.container.$emit('disable-value', this.disabledValue);
    }

    emitLostValue() {
        const lostValue = [];
        const {allChildIds, value} = this;
        for (let vi = 0, vl = value.length; vi < vl; ++vi) {
            if (!allChildIds.includes(value[vi])) {
                lostValue.push(value[vi]);
            }
        }
        this.lostValue = lostValue;
        // allChildIds的长度为0 近似认为options还没加载
        if (this.lostValue.length > 0 && allChildIds.length > 0) {
            this.container.$emit('lost-value', this.lostValue);
        }
    }

    switchLeftNode(pNode) {
        pNode.switch();
        return this.value;
    }

    switchRightNode(cNode) {
        cNode.switch();
        return this.value;
    }

    clearLostValue() {
        const {lostValue} = this;
        lostValue.forEach(lostId => {
            this.value.splice(this.value.indexOf(lostId), 1);
        });
        this.lostValue = [];
        return this.value;
    }

    getCheckedNodes() {
        return this.pNodes
            .filter(({status}) => ['part', 'all'].includes(status))
            .map(pNode => ({
                ...pNode,
                children: pNode.children
                    .filter(({selected, disabled}) => selected && !disabled),
            }));
    }
}
