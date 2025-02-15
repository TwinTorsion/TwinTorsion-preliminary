<script lang="ts">
    import { onMount, type SvelteComponent } from 'svelte';
    import {
      SvelteFlowProvider
    } from '@xyflow/svelte';
    import _ from 'lodash';
    import type { ComponentType, SystemType } from '$lib/types/types';
    import ComponentEditor from "$lib/editor/component-editor/ComponentEditor.svelte";
    import Sidebar from "$lib/sidebar/Sidebar.svelte";
    import ElementsList from '$lib/sidebar/ElementsList.svelte';
    import JSONEditor from "$lib/editor/JSONEditor.svelte";
    import TableEditor from '$lib/editor/component-editor/table-editor/TableEditor.svelte';
    import DialogBox from '$lib/DialogBox.svelte';
    import {
        currentSystemJSON,
        setCurrentSystem,
        currentComponentJSON,
        customComponents,
        createComponent,
        getComponent,
        saveCurrentComponent,
        notification,
        resetCurrentComponent,
        highlightLinesInEditor,
        createSystem,
    } from '$lib/stores/stores.js';
    import { goto } from '$app/navigation';
    import Button from '$lib/Button.svelte';
    import DropdownButton from '$lib/DropdownButton.svelte';
    import { exportJSON, importComponent } from '$lib/utils';
    import NameField from '$lib/NameField.svelte';
    import TopBar from '$lib/TopBar.svelte';
    import Tabs from '$lib/Tabs.svelte';
    import {
        handleJSONEditing,
        handleNameChange,
        checkElementOrder
    } from '$lib/editor/component-editor/componentHelpers';
    
    let fileInput: HTMLInputElement;
    let selectedEditor: string;

    let componentEditor: any;
    let isNameError = false;
    let isError = false;
    let componentName: string;
    let JSONEditorComponent: SvelteComponent;
    onMount(() => {
        highlightLinesInEditor.set(JSONEditorComponent.highlightLines)
        isError = !handleJSONEditing(JSONEditorText, originalName);
    });

    export let data;
    let originalName: string;
    let dialogBox: SvelteComponent;

    // initialize the current component JSON
    // if url contained a component id, set the current component JSON to that component
    const newComponent = () => {
        let newComponent: ComponentType;
        [data.componentId, newComponent] = createComponent();
        originalName = newComponent.name;
    }

    if (data.componentId) {
        if ($currentComponentJSON.id == data.componentId) {
            // component is already loaded
            originalName = $currentComponentJSON.json.name;
        } else if (Array.from($customComponents.keys()).includes(data.componentId)) {
            // load the system corresponding to the component
            setCurrentSystem(data.componentId.split('-')[0]);

            originalName = getComponent(data.componentId)?.name as string;
            currentComponentJSON.set({
                id: data.componentId,
                json: getComponent(data.componentId) as ComponentType
            });
        } else {
            // component with name in url does not exist
            onMount(() => {
                goto('/');
            });
        }
    } else {
        // if current system is not set, ask user whether to create a new system
        if (!$currentSystemJSON.id) {
            currentComponentJSON.set({
                        id: '-1',
                        json: {
                            name: 'New Component',
                            elements: []
                        }
            });
            onMount(() => {
                dialogBox.openDialog("Do you want to create a new system to store your component?",
                "Yes","Choose an existing system").then((value: boolean) => {
                    if (value) {
                        // create a new system
                        let newSystem: SystemType, systemId: string;
                        [systemId, newSystem] = createSystem(null, true);
                        currentSystemJSON.set({id: systemId, json: newSystem});
                        newComponent();
                        goto(`/component-editor/${data.componentId}`, { replaceState: true });
                    } else {
                        goto('/');
                    }
                });
            });
        } else {
            newComponent();
            onMount(() => {
                goto(`/component-editor/${data.componentId}`, { replaceState: true });
            });
        }
    }

    // sync the JSON editor text with the current component JSON
    let JSONEditorText = '';
    currentComponentJSON.subscribe((value) => {
        notification.set(null);
        JSONEditorText = JSON.stringify(value.json, null, 2);
        isNameError = false;
        componentName = value.json.name;

        // check if the elements are in the correct order
        isError = !checkElementOrder(value.json.elements);
    });

    // handle pressing the save button
    const handleSave = () => {
        saveCurrentComponent();
        notification.set({
            message: "Component saved succesfully.",
            type: "success",
            duration: 3000
        });
        goto(`/system-editor/${$currentComponentJSON.id.split('-')[0]}`);
    }

    // handle pressing the back button
    const handleBack = () => {
        const currentSystemId = $currentComponentJSON.id.split('-')[0];

        if ($currentComponentJSON.json.elements.length === 0 ||
        _.isEqual($currentComponentJSON.json, $customComponents.get($currentComponentJSON.id))
        ) {
            resetCurrentComponent();
            notification.set(null);
            goto(`/system-editor/${currentSystemId}`);
        } else {
            dialogBox.openDialog("You have unsaved changes. Do you want to discard them?",
                "Discard changes","Cancel").then((value: boolean) => {
                    if (value) {
                        resetCurrentComponent();
                        goto(`/system-editor/${currentSystemId}`);
                        notification.set(null);
                    }
                });
        }
    }
    
    let editorElement: HTMLElement;
    let jsonEditorHeight = 220;
    let jsonEditorHeightPx = "";
    $: jsonEditorHeightPx = `${jsonEditorHeight}px`;
    $: flowEditorHeight = `calc(100% - ${jsonEditorHeight}px)`;
    
    let isResizing = false;
    const resizeEditor = (event: MouseEvent) => {
        const parentRect = editorElement.getBoundingClientRect();
        jsonEditorHeight = parentRect.bottom - event.clientY + 8;
    }

    // handle analysis button
    const handleAnalysis = () => {
        if (isError) return;
        if (_.isEqual($currentComponentJSON.json, $customComponents.get($currentComponentJSON.id))) {
            goto(`/analysis/${$currentComponentJSON.id}`);
        } else {
            dialogBox.openDialog("You have unsaved changes. Do you want to save them before proceeding?",
                "Save changes","Cancel").then((value: boolean) => {
                    if (value) {
                        saveCurrentComponent();
                        goto(`/analysis/${$currentComponentJSON.id}`);
                    }
                });
        }
    }

</script>
<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="true">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet">
    <title>Component Editor | TwinTorsion Editor</title>
</svelte:head>
<div class="main-screen">
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="main-editor-area"
        on:mouseup={() => {isResizing = false;}}
        on:mousemove={(event) => {
            if (isResizing) {
                resizeEditor(event);
            }
        }}
        style="--json-editor-height: {jsonEditorHeightPx}; --flow-editor-height: {flowEditorHeight};">
        <div class="flow-editor">
            <SvelteFlowProvider>
                <ComponentEditor bind:this={componentEditor} />
            </SvelteFlowProvider>
        </div>
        <div class="json-editor"
            bind:this={editorElement}>
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div class="resize-slider"
                on:mousedown={() => {isResizing = true;}}>
            </div>
            <Tabs bind:selectedTab={selectedEditor} tabs={["Table", "JSON"]} />
            {#if selectedEditor === "Table"}
                <TableEditor />
            {:else}
                <JSONEditor
                    bind:this={JSONEditorComponent}
                    bind:textContent={JSONEditorText}
                    onInput={(text) => {isError = !handleJSONEditing(text, originalName)}} />
            {/if}
        </div>
    </div>
    <TopBar>
        <svelte:fragment slot="links">
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <span on:click={handleBack} class="link-element">
                <svg class="icon-back" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>              
                Back
            </span>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <span class="link-element import-btn"
                on:click={() => fileInput.click()}>
                Import
            </span>
            <input type="file"
                style:display="none"
                name="file"
                bind:this={fileInput}
                on:change={(e) => importComponent(e, false)}
                accept=".tors">
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <span class="link-element analysis-btn"
                on:click={handleAnalysis}>
                Analysis
            </span>
        </svelte:fragment>
        <svelte:fragment slot="name">
            <NameField text="Component"
                    isError={isNameError} 
                    bind:value={componentName}
                    onInput={text => {isNameError = !handleNameChange(text, originalName)}} />
        </svelte:fragment>
        <svelte:fragment slot="buttons">
            <DropdownButton
                isActive={!isError}
                onClick={() => exportJSON($currentComponentJSON.json)}
                icon={'<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>'}
                options={["Download Tors file"]}
                optionIcons={['<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>',
                ]}>
                Export
            </DropdownButton>
            <Button
                onClick={handleSave}
                isActive={!isError}
                icon={'<svg class="icon-save" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>'}>
                Save Component
            </Button>
        </svelte:fragment>
    </TopBar>
    <Sidebar>
        <ElementsList />
    </Sidebar>
</div>
<DialogBox bind:this={dialogBox} />
<style>
    /* Resizing JSON editor */
    .resize-slider {
        width: 100%;
        height: 6px;
        background-color: rgba(0, 0, 0, 0.1);
        border: none !important;
        border-radius: 0;
        border-top: solid 1px rgb(215,215,215) !important;
        cursor: n-resize;
    }
    .flow-editor {
        height: var(--flow-editor-height);
    }
    .json-editor {
        height: var(--json-editor-height);
        position: relative;
        display: flex;
        flex-direction: column;
    }
    .link-element {
        color: rgba(255, 255, 255, 0.9);
        font-size: 14px;
        font-weight: 400;
        text-decoration: none;
        display: inline-block;
        cursor: pointer;
    }
    .main-editor-area {
        position: absolute;
        top: 68px;
        left: 360px;
        width: calc(100vw - 360px);
        height: calc(100vh - 68px);
        overflow: hidden;
        background-color: rgb(255, 255, 255);
    }
    .icon-back {
        width: 20px;
        height: 20px;
        margin: 0 -2px -5px 0;
    }
    
    .main-screen {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
    }
    @media (max-width: 1300px) {
        .import-btn {
            display: none;
        }
    }
    @media (max-width: 1200px) {
        .analysis-btn {
            display: none;
        }
    }
</style>