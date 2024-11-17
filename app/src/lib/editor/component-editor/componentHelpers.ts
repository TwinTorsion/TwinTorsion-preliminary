import type { ElementType, ComponentType } from '$lib/types/types';
import { currentComponentJSON, notification, customComponents } from '$lib/stores/stores';
import { possibleParams } from '$lib/editor/component-editor/params';
import { isNameValid, isNameUnique } from '$lib/utils';
import { get } from 'svelte/store';
import { isElementType } from '$lib/types/typeguards';
import type { Node } from '@xyflow/svelte';
import _ from 'lodash';

export const handleNameChange = (name: string, originalName: string = '') => {
    if (name === undefined) {
        notification.set(
        {
            message: "Name field is missing.",
            type: "error",
            duration: 3600000
        });
        return false
    } else if (typeof name !== 'string') {
        notification.set(
        {
            message: "Name field has to be a string.",
            type: "error",
            duration: 3600000
        });
        return false
    } else if (!isNameValid(name)) {
        notification.set(
        {
            message: "Name field is invalid.",
            type: "error",
            duration: 3600000
        });
        return false
    } else if (originalName !== '' && !isNameUnique(name, Array.from(get(customComponents).values()), originalName)) {
        notification.set(
        {
            message: "Component name has to be unique.",
            type: "error",
            duration: 3600000
        });
        return false
    } else {
        currentComponentJSON.update(json => {
            let newJson = {...json};
            newJson.json.name = name;
            return newJson;
        });
        notification.set(null);
        return true
    }
}

export const handleJSONEditing = (text: string, originalName: string = '') => {
    try {
        const json = JSON.parse(text);
        
        // Check name and set if it is valid
        if (!handleNameChange(json.name, originalName)) {
            return false
        }

        const newJson = {...get(currentComponentJSON)}

        // Check elements and set if valid
        if (!json.elements) {
            notification.set(
            {
                message: "Elements field is missing from JSON.",
                type: "error",
                duration: 3600000
            });
            return false
        } else if (!Array.isArray(json.elements)) {
            notification.set(
            {
                message: "Elements field in JSON has to be an array.",
                type: "error",
                duration: 3600000
            });
            return false
        } else if (!json.elements.every(isElementType)) {
            notification.set({
                message: "Some elements are invalid. Please check the element properties.",
                type: "info",
                duration: 3600000
            });
            return false

        } else if (json.elements.length === 0) {
            notification.set(
            {
                message: "Component must have at least one element.",
                type: "info",
                duration: 3600000
            });
            return false

        } else {
            newJson.json.elements = json.elements;
        }

        currentComponentJSON.set(newJson);
        notification.set(null);
        return true
    } catch (e) {
        notification.set(
            {
                message: "Component JSON is not valid.",
                type: "info",
                duration: 3600000
            }
        );
        return false
    } 
}

export const checkElementOrder = (elements: ElementType[]) => {
    let isValid = elementOrderValid(elements);
    if (!isValid.valid) {
        notification.set(
            {
                message: isValid.message,
                type: "info",
                duration: 3600000
            });
        return false
    } else {
        return true
    }
}

const hasValidParent = (childElement: ElementType, elements: ElementType[]) => {
    return (
        childElement.type === "GearElement" &&
        childElement.parent &&
        childElement.parent !== childElement.name &&
        elements.find(el => (
            el.type === "GearElement" && el.name === childElement.parent
        )) !== undefined
    );
}

// function to check if the order of elements in a component is valid
// (doesn't catch all invalid orders)
const elementOrderValid = (elements: ElementType[]) => {
    let valid = true;
    let message = "";
    const shafts: any[] = ["ShaftDiscrete", "ShaftContinuous"];
    
    // component can't start with a shaft (but can consist only of a shaft)
    if (elements.length > 1 && shafts.includes(elements.at(0)?.type)) {
            valid = false;
        message = "Component can't start with a shaft."
    }

    let outputElements = findComponentOutputs(elements);
    let prevElem: ElementType | undefined;
    for (let element of elements) {
        // shaft can't be connected to another shaft
        if (shafts.includes(element.type) && shafts.includes(prevElem?.type)) {
            valid = false;
            message = "Two shafts can't be connected."
            break;
        }

        // disk element can't be connected to a gear element
        if (element.type === "Disk" && prevElem?.type === "GearElement") {
            valid = false;
            message = "Disk element can't be connected to a gear element."
            break;
        }

        // gear element can only be connected to a shaft
        if (element.type === "GearElement" &&
                !hasValidParent(element, elements) &&
                (prevElem?.type  === "Disk" || prevElem?.type === "GearElement")
            ) {
            valid = false;
            message = "Gear element can only be connected to a shaft."
            break;
        }

        // output elements can't be shafts
        if (elements.length > 1 &&
            shafts.includes(element.type) &&
            outputElements.includes(element.name)) {
            valid = false;
            message = "Output elements can't be shafts."
            break;
        }

        prevElem = element;
    }

    return {
        valid: valid,
        message: message
    };
}

// Find possible output elements of a component
export const findComponentOutputs = (elements: ElementType[]): string[] => {
    const outputs: string[] = [];
    for (let i = 0; i < elements.length; i++) {
        const nextEl = elements[i+1];
        if (i === elements.length - 1) {
            outputs.push(elements[i].name);
        } else if (nextEl.type === "GearElement" &&
            nextEl.parent &&
            elements.slice(0, i+1).map(el => el.name).includes(nextEl.parent)) {
        
            outputs.push(elements[i].name);
        
        }
    }
    return outputs;
}

// edit an element in the list of elements
// removeUndefined: if true, undefined or empty values in newValues are removed even if they were previously defined
export const editElement = (elements: ElementType[] | undefined,
    elementName: string,
    newValues: Partial<ElementType>,
    removeUndefined=false ): ElementType[] => {

    if (!elements) {elements = []};

    let newElements = [...elements];
    newElements.forEach((el, index) => {
        if (el.name === elementName) {
            let newEl: ElementType = {...el, ...newValues} as ElementType;
            
            if (removeUndefined) {
                const undefinedKeys = Object.keys(newValues)
                    .filter(key => (newValues as any)[key] === undefined || (newValues as any)[key] === "");
                newEl = _.omit(newEl, undefinedKeys) as ElementType;
            }

            newElements[index] = newEl;
        }
    });

    return newElements;
}

// remove a parameter of an element in the list of elements
export const removeParam = (elements: ElementType[], elementName: string, paramName: string): ElementType[] => {
    let newElements = [...elements];

    newElements.forEach((el, index) => {
        if (el.name === elementName) {
            const newParams = _.omit(el, paramName);
            newElements[index] = newParams as ElementType;
        }
    });

    return newElements;
}

// function to automatically give a unique name to a new component
export const nameComponentDesign = (components: ComponentType[]) => {
    const compNames = components.map(comp => comp.name);
    let newCompName = 'New Component';
    let i = 2;
    while (compNames.includes(newCompName)) {
        newCompName = `New Component (${i})`
        i++;
    }

    return newCompName;
}

// function to automatically give a unique name to a new element
export const nameElement = (type: string, elements: ElementType[]) => {
    const elemToNum = (el: ElementType) => {
        const nameList = el.name.split(" ")
        const nameWithoutLastWord = nameList.slice(0, -1).join(' ')
        if (nameWithoutLastWord === type) {
            return parseInt(nameList.at(-1) || '0')
        } else {
            return null
        }
    }
    const largestNum = elements.map(elemToNum).filter(el => el !== null).sort((a, b) => a - b).at(-1)
    return `${type} ${largestNum ? largestNum + 1 : 1}`;
}

// function to construct a default element based on the type
export const defaultElement = (elements: ElementType[], type: string): ElementType => {
    if (type === "Disk") {
        return {
            name: nameElement('Disk', elements),
            type: "Disk",
            damping: 0,
            inertia: 5.72e+03
        }
    } else if (type === "ShaftDiscrete") {
        return {
            name: nameElement('Shaft', elements),
            type: "ShaftDiscrete",
            damping: 0,
            stiffness: 4.49e+09
        }
    }  else if (type === "ShaftContinuous") {
        return {
            name: nameElement('Shaft', elements),
            type: "ShaftContinuous",
            damping: 0,
            length: 100,
            innerDiameter: 14,
            outerDiameter: 20
        }
    } else if (type === "GearElement") {
        return {
            name: nameElement('Gear', elements),
            type: "GearElement",
            inertia: 5.72e+03,
            diameter: 230
        }
    } else {
        throw new Error("Invalid element type");
    }
}

// function to add an element of a certain type to the current component
export const addElement = (type: string) => {
    currentComponentJSON.update(value => {
        let newVal = {...value};
        newVal.json.elements = [...value.json.elements,
            defaultElement((value.json.elements ? value.json.elements : []), type)];
        return newVal;
    });
}

// function to get a map of element names to their respective OpenTorsion node numbers
export const assignNodeNumbers = (elements: ElementType[]): Record<string, string> => {
    let nodeNo = 0;
    let nodeNumbers: Record<string, string> = {};
    elements.forEach((el, index) => {
        if (el.type === "ShaftDiscrete" || el.type === "ShaftContinuous") {
            nodeNumbers[el.name] = `${nodeNo}-${nodeNo+1}`;
            if (elements[index + 1] &&
                elements[index + 1].type !== "ShaftDiscrete" &&
                elements[index + 1].type !== "ShaftContinuous") {
                nodeNo += 1;
            }
        } else if (el.type === "GearElement") {
            nodeNumbers[el.name] = nodeNo.toString();

            // if the gear has a valid parent, increment nodeNo
            if (el.parent && el.parent !== el.name &&
                elements.find(el2 => el2.name === el.parent)?.type === "GearElement"
            ) {
                nodeNo += 1;
            }
        } else {
            nodeNumbers[el.name] = nodeNo.toString();
        }

    });

    return nodeNumbers;
}


// function to update the nodes in the component editor
// based on currentComponentJSON
export const updateComponentEditor = (nodes: Node[]) => {
    const currentJSON = get(currentComponentJSON).json;
    const newNodes: any[] = [];
    
    // if elements is empty, add "Component is empty" node 
    if (currentJSON.elements.length === 0) {
        newNodes.push({
            id: `empty`,
            type: 'Empty',
            dragHandle: '.none',
            data: {label: ''},
            position: { x: 0, y: 150 }
        });
    }
    
    let currentX = 0;
    let currentY = 150;
    type Junction = {
        x: number,
        startY: number,
        endY: number,
        count: number
    }
    let branches = new Map<string, Junction>();

    // OpenTorsion node number
    let nodeNos = assignNodeNumbers(currentJSON.elements);
    // loop through elements and create nodes
    currentJSON.elements.forEach((el: ElementType, index: number) => {   
        if (el.type === "Disk") {
            
            newNodes.push({
                id: `${index + 1}`,
                type: el.type,
                dragHandle: '.none',
                data: {
                    nodeNo: nodeNos[el.name],
                    data: _.pick(el, [
                        ...possibleParams[el.type].required,
                        ...possibleParams[el.type].optional
                    ] )
                },
                position: { x: currentX, y: currentY }
            });
            currentX += 21;

        } else if (el.type === "ShaftDiscrete" || el.type === "ShaftContinuous") {
            newNodes.push({
                id: `${index + 1}`,
                type: el.type,
                dragHandle: '.none',
                data: {
                    nodeNo: nodeNos[el.name],
                    data: _.pick(el, [
                        ...possibleParams[el.type].required,
                        ...possibleParams[el.type].optional
                    ])
                },
                position: { x: currentX, y: currentY }
            });
            currentX += 72;
        
        } else if (el.type === "GearElement") {
            // check if the gear has a parent
            if (el.parent && branches.get(el.parent) && el.name !== el.parent) {
                // add element to branches with shared value across all gears with the same parent
                branches.set(el.name, branches.get(el.parent) as Junction);

                // update the endY of the parent gear
                currentY += 100;
                (branches.get(el.name) as Junction).endY = currentY;
                (branches.get(el.name) as Junction).count = (branches.get(el.name) as Junction).count+1;
                currentX = (branches.get(el.parent) as Junction).x;
            } else {
                // add element to branches with its own position
                branches.set(el.name, {x: currentX, startY: currentY, endY: currentY, count: 1});
            }

            newNodes.push({
                id: `${index + 1}`,
                type: el.type,
                dragHandle: '.none',
                data: {
                    nodeNo: nodeNos[el.name],
                    data: _.pick(el, [
                        ...possibleParams[el.type].required,
                        ...possibleParams[el.type].optional
                    ])
                },
                position: { x: currentX, y: currentY }
            });

            currentX += 21;
        }
    });

    // add gearboxes
    let gearboxes: any[] = [];
    const uniqueBranches = new Set(branches.values());
    uniqueBranches.forEach(value => {
        if (value.count > 1) {
            gearboxes.push({
                id: `gearbox-${value.x}`,
                type: 'Gearbox',
                draggable: false,
                data: {
                    height: value.endY - value.startY,
                    count: value.count
                },
                position: { x: value.x, y: value.startY }
            });
        }
    });

    // nodes are added in reverse order so elements that come earlier are on top
    newNodes.push(...gearboxes);

    return newNodes.reverse();
}