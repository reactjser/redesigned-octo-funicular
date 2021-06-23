import intersection from 'lodash/intersection';
import without from 'lodash/without';

export function plainToTree(plainData, mapping) {
    if (!Array.isArray(plainData)) {
        throw new Error('plainData must be an array!');
    }
    const mappingProps = Object.getOwnPropertyNames(mapping);
    const propsShouldContain = ['pId', 'pLabel', 'cId', 'cLabel'];
    propsShouldContain.forEach(prop => {
        if (!mappingProps.includes(prop)) {
            throw new Error(`mapping should has prop [${prop}]`);
        }
    });

    return plainData.reduce((accumulator, current) => {
        const groupIndex = accumulator.findIndex(pNode => pNode.id === current[mapping.pId]);
        const group = accumulator[groupIndex];
        if (group) {
            const sub = {
                id: current[mapping.cId],
                label: current[mapping.cLabel],
                selected: false,
                parentIndex: groupIndex,
            };
            group.children.push(sub);
        }
        else {
            const newGroup = {
                id: current[mapping.pId],
                label: current[mapping.pLabel],
                // off part all
                status: 'off',
            };
            const sub = {
                id: current[mapping.cId],
                label: current[mapping.cLabel],
                selected: false,
                parentIndex: accumulator.length,
            };
            newGroup.children = [sub];
            accumulator.push(newGroup);
        }
        return accumulator;
    }, []);
}

export function xorValue(newValue, oldValue) {
    const intersectionArr = intersection(newValue, oldValue);
    return [without(newValue, ...intersectionArr), without(oldValue, ...intersectionArr)];
}

export function isEveryChildSelect(children, allIds) {
    return children.every(cNode => allIds.includes(cNode.id));
}

export function isEveryChildUnselect(children, allIds) {
    return children.every(cNode => !allIds.includes(cNode.id));
}
