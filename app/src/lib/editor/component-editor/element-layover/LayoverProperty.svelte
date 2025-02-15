<script lang="ts">
    import type { ExcitationType } from "$lib/types/types";
    import { camelToTitle } from "$lib/utils";
    import { paramTypes } from "../params";

    export let isEditing: boolean;
    export let paramName: string;
    export let paramValue: string | number | ExcitationType | undefined;
    export let paramUnit: string | undefined;
    export let onChange: (key: string, value: any) => void;
    export let required: boolean = false;

    const makeString = (val: string | number | ExcitationType | undefined) => {
        if (typeof val === 'object') {
            return JSON.stringify(val);
        } else {
            return val?.toString();
        }
    }

    let displayName: string | undefined = camelToTitle(paramName);
    let displayValue: string | undefined = makeString(paramValue);
    let isUndef: boolean;
    $: isUndef = typeof paramValue === 'undefined';
    let onHover = false;

    const makeDef = () => {
        if (isUndef) {
            if (paramName === "excitation") {
                paramValue = {
                    type: "excitationValuesRpmPercentage",
                    values: [[]]
                };
            } else if (paramName === "parent") {
                paramValue = "Gear 1";
            } else {
                paramValue = 0;
            }
            isUndef = false;
            onChange(paramName, paramValue);
        }
        displayValue = makeString(paramValue);
    }

    const makeUndef = () => {
        paramValue = undefined;
        isUndef = true;
        onChange(paramName, paramValue);
    }

    // handle input
    let inFocus = false;
    const handleChange = (event: any) => {
        let newParamValue = event.target.value;

        // convert large numbers to engineering notation
        const isNormalNumber = /^-?\d+(\.\d+)?$/.test(newParamValue);
        if (isNormalNumber && Number(newParamValue) > 10000000) {
            newParamValue = toEngineeringNotation(Number(newParamValue));
        }

        // remove illegal characters
        const illegalChars = /['"\n]/g;
        const isObj = newParamValue.startsWith("{") && newParamValue.endsWith("}");
        if (!isObj && illegalChars.test(newParamValue)) {
            newParamValue = newParamValue.replace(illegalChars, '');
        }

        onChange(paramName, newParamValue);
        displayValue = newParamValue;
    }
    // When JSON editing happens, update display value
    $: if (!inFocus && paramValue) {
        const isNormalNumber = /^-?\d+(\.\d+)?$/.test(paramValue.toString());
        if (isNormalNumber && Number(paramValue) > 10000000) {
            displayValue = toEngineeringNotation(Number(paramValue));
        } else {
            displayValue = makeString(paramValue);
        }
    }

    // helper function to convert large numbers to engineering notation
    const toEngineeringNotation = (num: number)=> {
        if (num === Infinity) {
            return "Infinity";
        }

        const exponent = Math.floor(Math.log10(num) / 3) * 3;
        const mantissa = num / Math.pow(10, exponent);

        return `${mantissa}e+${exponent}`
    };
</script>
<p class="main-prop-cont {isUndef ? 'undef-cont' : 'def-cont'} {isEditing ? "active" : ""} {onHover ? "hover" : ""}"
    on:mouseenter={() => {onHover = true}}
    on:mouseleave={() => {onHover = false}}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <span class="param-name"
        on:click={makeDef}>
        <svg class="icon-add" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        {displayName}<span class="param-unit {paramUnit ? '' : 'empty'}">{
                paramUnit ? `(${paramUnit})` : ''
        }</span><span class="param-colon">:</span>
    </span>
    <span class="param-val-outer">
        <input
            type={paramTypes[paramName] === "number" ? "number" : "text"}
            name={paramName}
            on:input={handleChange}
            on:focus={() => {inFocus = true}}
            on:focusout={() => {inFocus = false}}
            class="param-val" 
            readonly="{paramName === "type"}"
            value={displayValue}
            style={`width: ${typeof paramValue !== 'undefined' ? displayValue?.toString().length : "4"}ch;`}
        />
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <svg
            on:click={() => {makeUndef()}}
            class="icon-close {isEditing && !required ? 'active' : ''}"
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
    </span>
</p>
<style>
    .param-unit {
        font-size: 12px;
        color: rgba(0, 0, 0, 0.5);
        margin-left: 4px;
    }
    .param-unit.empty {
        display: none;
    }
    .main-prop-cont {
        -moz-user-select: -moz-none;
        -khtml-user-select: none;
        -webkit-user-select: none;
        -ms-user-select: none;
        user-select: none;
    }
    .def-cont .param-name {
        padding: 4px;
    }
    .def-cont {
        padding: 2px 2px 2px 10px;
        margin: 0;
    }
    .def-cont:hover {
        background-color: rgba(0, 0, 0, 0.04);
    }
    .undef-cont .param-val-outer, .undef-cont .param-colon, .undef-cont .param-unit {
        display: none;
    }
    .icon-add {
        display: none;
    }
    .undef-cont .icon-add {
        display: initial;
        width: 15px;
        height: 15px;
        margin: 0 0 -3px 0;
    }
    .undef-cont .param-name {
        color: rgba(0, 0, 0, 0.5);
        font-size: 12px;
        padding: 0px;
        cursor: pointer;
    }
    .undef-cont {
        display: none !important;
        order: 999;
    }
    .undef-cont.active {
        display: flex !important;
        justify-content: space-between;
    }
    .undef-cont .param-name:hover {
        color: rgba(0, 0, 0, 0.9);
    }
    .param-val {
        padding: 2px;
        border-radius: 5px;
        border: solid 2px rgba(0, 0, 0, 0);
        font-weight: 600;
        font-family: "Roboto Mono", monospace;
        line-height: 1;
        background-color: transparent;
        max-width: 15ch;
        margin-top: 0.5px;
    }
    .param-val:read-only:focus {
        outline: none;
    }
    .param-val:not([readonly]) {
        border: solid 2px rgba(0, 0, 0, 0.1);
        background-color: white;
        font-weight: 400;
        max-width: 7ch;
    }
    .param-name {
        padding: 2px;
        font-family: "Roboto Mono", monospace;
    }
    .icon-close {
        width: 12px;
        height: 12px;
        cursor: pointer;
        color: rgba(0, 0, 0, 0.4);
        margin-bottom: -1px;
        margin-left: -2px;
        margin-right: 2px;
        opacity: 0;
        pointer-events: none;
    }
    .icon-close:hover {
        color: rgb(214, 81, 81);
    }
    .hover .icon-close.active {
        opacity: 1;
        pointer-events: all;
    }
    p {
        margin: 6px;
        display: flex;
        justify-content: space-between;
        font-family: "Roboto Mono", monospace;
    }

    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    input[type=number] {
        appearance: textfield;
        -moz-appearance: textfield;
    }
</style>