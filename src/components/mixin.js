export default {
    model: {
        prop: 'value',
        event: 'select',
    },
    props: {
        value: {
            type: [Array, Number, String],
        },
        useExistCurrentPId: {
            type: Boolean,
            default: false
        },
        isAsyncSearch: {
            type: Boolean,
            default: false
        },
        isAsyncLeftNode: {
            type: Boolean,
            default: false
        },
        rightLoading: {
            type: Boolean,
            default: false
        },
        options: {
            type: Array,
            required: true,
            validator(options) {
                return options.every(opt =>
                    opt.id !== void 0
                    && Array.isArray(opt.children));
            }
        },
        // 是否单选
        single: {
            type: Boolean,
            default: false,
        },
        // 右侧节点个数初始值
        // 滚动到底部后，如果还有未显示的节点，数量会加上一倍
        nodeLimit: {
            type: Number,
            default: 200,
        },
        // 没有显示内容时的默认显示内容
        emptyText: {
            type: String,
            default: '--',
        },
        // 左侧搜索框placeholder
        leftSearchPlaceholder: {
            type: String,
            default: '请输入想查找的内容',
        },
        // 右侧搜索框placeholder
        rightSearchPlaceholder: {
            type: String,
            default: '请输入想查找的内容',
        },
        // 没有选中任何数据时默认选中全部
        isDefaultSelectAll: {
            type: Boolean,
            default: false,
        },
    }
};
