import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { RunnableToolFunction, RunnableToolFunctionWithParse } from 'openai/lib/RunnableFunction';
import _get from "lodash/get"
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import { RunSubmitToolOutputsParams } from 'openai/resources/beta/threads/runs/runs';
import { FileCreateParams, FileObject, FunctionDefinition } from 'openai/resources';
import { Uploadable, toFile } from 'openai/uploads';

dotenv.config();

interface Chat {
    fromName: string;
    toName: string;
    message: string;
    created: Date;
}

export interface KnowledgeFile {
    url: string
    writePath: string
    title?: string
    content?: string
    error?: string
}

export type ThreadMessage = OpenAI.Beta.Threads.ThreadMessage;
export type Thread = OpenAI.Beta.Threads.Thread;
export type Assistant = OpenAI.Beta.Assistant
export type TurboTool = RunnableToolFunctionWithParse<any> & { callable: Function };
export type ToolOutput = OpenAI.Beta.Threads.RunSubmitToolOutputsParams.ToolOutput;
export type AssistantTool = OpenAI.Beta.Threads.Runs.RunCreateParams.AssistantToolsFunction | OpenAI.Beta.Threads.Runs.RunCreateParams.AssistantToolsRetrieval | OpenAI.Beta.Threads.Runs.RunCreateParams.AssistantToolsCode


export class Turbo4 {
    private openAIKey: string;
    private client: OpenAI;
    private mapFunctionTools: Record<string, TurboTool>;
    private currentThreadId: string | null;
    private threadMessages: ThreadMessage[];
    private localMessages: string[];
    private fileIds: string[];
    private assistantId: string | null;
    private pollingInterval: number;
    private model: string;
    private runId: string | null;
    private retrievalEnabled: boolean;

    constructor() {
        this.openAIKey = process.env.OPENAI_API_KEY || '';
        this.client = new OpenAI({
            apiKey: this.openAIKey,
        });
        this.mapFunctionTools = {};
        this.currentThreadId = null;
        this.threadMessages = [];
        this.localMessages = [];
        this.fileIds = [];
        this.assistantId = null;
        this.pollingInterval = 0.5;  // Default value
        this.model = 'gpt-4-1106-preview';  // Default model
        this.runId = null;
        this.retrievalEnabled = false;
    }

    get chatMessages(): Chat[] {
        /**
         * Example threadMessages:
         * [
                {
                    id: 'msg_Px5UB0GnacMXtsC0oIutYsQa',
                    object: 'thread.message',
                    created_at: 1704558300,
                    thread_id: 'thread_ylofBjPK8cHwrEQHkJNi6nPH',
                    role: 'assistant',
                    content: [ [Object] ],
                    file_ids: [],
                    assistant_id: 'asst_Se3G7am12eqYE7iopEAHAWbr',
                    run_id: 'run_hGdx2LM8GPVaoJK8tAv4VaUB',
                    metadata: {}
                },
                {
                    id: 'msg_sltl5a9CMDyRwl8QbLL2m7a0',
                    object: 'thread.message',
                    created_at: 1704558299,
                    thread_id: 'thread_ylofBjPK8cHwrEQHkJNi6nPH',
                    role: 'user',
                    content: [ [Object] ],
                    file_ids: [],
                    assistant_id: null,
                    run_id: null,
                    metadata: {}
                }
            ]
         */
        return this.threadMessages.map(msg => ({
            fromName: _get(msg, 'role', 'unknown'),
            toName: msg.role === 'user' ? 'assistant' : 'user',
            message: _get(msg, 'content[0].text.value', ''),
            created: new Date(_get(msg, 'created_at', 0) * 1000),
        }));
    }

    async collectKnowledge(url: string, writePath: string): Promise<KnowledgeFile> {
        const knowledge: KnowledgeFile = {
            url: url,
            writePath: writePath
        };

        try {
            const response = await axios.get(url);
            const $ = cheerio.load(response.data);

            // Example: Extracting title and content
            knowledge.title = $('title').text();
            knowledge.content = $('body').text(); // or any specific element you want to extract

            // remove excessive whitespace and tabs
            // knowledge.content = knowledge.content.replace(/\s+/g, ' ').trim().replace(/\t/g, '');
            knowledge.content = knowledge.content.replace(/\t/g, '');

            await fs.writeFile(writePath, JSON.stringify(knowledge, null, 2), 'utf-8');
        } catch (error: any) {
            knowledge.error = error.message;
        }

        return knowledge;
    }

    async spyOnAssistant(outputFile: string): Promise<this> {
        const sortedMessages = this.chatMessages.sort((a, b) => a.created.getTime() - b.created.getTime());

        const messagesAsJson = JSON.stringify(sortedMessages, null, 2);

        await fs.writeFile(outputFile, messagesAsJson, 'utf-8');

        return this;
    }

    getCostsAndTokens(outputFile: string): [number, number] {
        // Placeholder implementation
        console.log(`getCostsAndTokens(${outputFile})`);
        throw new Error('Not implemented');
        return [0, 0];
    }

    async getOrCreateAssistant(name: string, model: string = 'gpt-4-1106-preview'): Promise<this> {
        console.log(`getOrCreateAssistant(${name}, ${model})`);

        const assistants = await this.client.beta.assistants.list();

        const existingAssistant = assistants.data.find(assistant => assistant.name === name);

        if (existingAssistant) {
            this.assistantId = existingAssistant.id;

            if (existingAssistant.model !== model) {
                console.log(`Updating assistant model from ${existingAssistant.model} to ${model}`);
                await this.client.beta.assistants.update(existingAssistant.id, { model });
            }

            console.log(`Assistant ${name} retrieved with ID: ${this.assistantId}`)
        } else {
            const newAssistant = await this.client.beta.assistants.create({ name, model });
            this.assistantId = newAssistant.id;
            console.log(`Assistant ${name} created with ID: ${this.assistantId}`);
        }

        this.model = model;

        return this;
    }

    async getOrCreateAssistantById(name: string, assistantId: string, model: string = 'gpt-4-1106-preview'): Promise<this> {
        try {
            const assistant = await this.client.beta.assistants.retrieve(assistantId);
            if (assistant.name !== name) {
                console.warn(`Retrieved assistant name ${assistant.name} does not match the requested name ${name}.`);
            }
            this.assistantId = assistant.id;
            console.log(`Assistant ${name} retrieved with ID: ${assistant.id}`);
        } catch (error: any) {
            if (error.response && error.response.status === 404) {
                try {
                    const newAssistant = await this.client.beta.assistants.create({
                        model: model,
                        name: name,
                    });
                    this.assistantId = newAssistant.id;
                    console.log(`Assistant ${name} created with ID: ${newAssistant.id}`);
                } catch (createError) {
                    console.error(`Error creating assistant: ${createError}`);
                    throw createError;
                }
            } else {
                console.error(`Error retrieving assistant: ${error}`);
                throw error;
            }
        }
        return this;
    }

    async setInstructions(instructions: string): Promise<this> {
        if (!this.assistantId) {
            throw new Error('Assistant must be created before setting instructions.');
        }
        try {
            const assistant = await this.client.beta.assistants.update(this.assistantId, {
                instructions: instructions,
            });
            console.log(`Instructions updated for assistant ${assistant.name}`);
        } catch (error) {
            console.error(`Error updating instructions for assistant ${this.assistantId}: ${error}`);
            throw error;
        }
        return this;
    }

    async equipTools(turboTools: TurboTool[], equipOnAssistant: boolean = false): Promise<this> {
        console.log(`equipTools(${turboTools}, ${equipOnAssistant})`);

        // Update the functions dictionary with the new tools
        this.mapFunctionTools = turboTools.reduce((acc, tool) => {
            acc[tool.function.name!] = tool;
            return acc;
        }, {} as Record<string, TurboTool>);

        if (equipOnAssistant && this.assistantId) {

            if (!this.assistantId) {
                throw new Error('Assistant must be created before equipping tools.');
            }

            throw new Error('Not implemented');

            // If 'equipOnAssistant' is true, update the assistant with the new list of tools
            // this.client.beta.assistants.update(this.assistantId!, {

            //     tools: turboTools.map(tool => tool.function),
            // }).then(() => {
            //     console.log('Tools equipped on the assistant.');
            // }).catch(error => {
            //     console.error(`Error equipping tools on the assistant: ${error}`);
            //     throw error;
            // });
        }

        return this;
    }

    async makeThread(): Promise<this> {
        console.log(`makeThread()`);

        if (!this.assistantId) {
            throw new Error('Assistant must be created before making a thread.');
        }

        const response = await this.client.beta.threads.create()

        this.currentThreadId = response.id;

        return this;
    }

    async addMessage(message: string, fileIds?: string[], refreshThreads: boolean = false): Promise<this> {
        console.log(`addMessage(message=${message}, fileIds=${fileIds})`);

        if (!this.currentThreadId) {
            throw new Error('Thread must be created before adding a message.');
        }

        this.localMessages.push(message);

        await this.client.beta.threads.messages.create(this.currentThreadId, {
            content: message,
            file_ids: fileIds,
            role: 'user',
        });

        if (refreshThreads) {
            await this.loadThreads();
        }

        return this;
    }

    async loadThreads(): Promise<void> {
        console.log(`loadThreads()`);
        if (!this.currentThreadId) {
            throw new Error('Thread must be created before loading threads.');
        }
        this.threadMessages = (await this.client.beta.threads.messages.list(this.currentThreadId)).data;
    }

    listSteps(): void {
        console.log(`listSteps()`);
        if (!this.currentThreadId) {
            throw new Error('Thread must be created before listing steps.');
        }
        if (!this.runId) {
            throw new Error('Run must be created before listing steps.');
        }
        const steps = this.client.beta.threads.runs.steps.list(this.currentThreadId, this.runId);
    }

    async runThread(toolbox?: string[]): Promise<this> {
        console.log(`runThread(toolbox=${toolbox})`);

        if (!this.currentThreadId) {
            throw new Error('Thread must be created before running.');
        }
        if (!this.assistantId) {
            throw new Error('Assistant must be created before running.');
        }

        const toolsToRun: TurboTool[] = toolbox ? toolbox.map(toolName => this.mapFunctionTools[toolName]) : Object.values(this.mapFunctionTools);
        const tools: AssistantTool[] = toolsToRun.map(tool => ({
            function: {
                name: tool.function.name,
                description: tool.function.description,
                parameters: tool.function.parameters,
            },
            type: 'function',
        }) as AssistantTool);

        if (this.retrievalEnabled) {
            tools.push({
                type: 'retrieval',
            });
        }

        // Create a thread run
        const run = await this.client.beta.threads.runs.create(this.currentThreadId, {
            assistant_id: this.assistantId,
            tools,
        });

        this.runId = run.id;

        // Polling mechanism for thread's run completion or required actions
        while (true) {
            const runStatus = await this.client.beta.threads.runs.retrieve(this.currentThreadId, this.runId);
            if (runStatus.status === 'requires_action' && runStatus.required_action) {
                const toolOutputsPromises: Promise<ToolOutput>[] = runStatus.required_action.submit_tool_outputs.tool_calls.map(async toolCall => {
                    const toolFunction = toolCall.function;
                    const toolName = toolFunction.name;
                    const toolArguments = toolFunction.arguments;


                    console.log(`Running tool ${toolName} with arguments: ${toolArguments}`)

                    const toolToRun: TurboTool = this.mapFunctionTools[toolName];

                    const parsedArgs = toolToRun.function.parse(toolArguments);
                    const functionOutput = await toolToRun.callable(parsedArgs);
                    const output: ToolOutput = {
                        tool_call_id: toolCall.id,
                        output: functionOutput,
                    }
                    return output;
                });

                const toolOutputs = await Promise.all(toolOutputsPromises)

                console.log(`toolOutputs`, toolOutputs)

                const toolOutputsActually: RunSubmitToolOutputsParams = {
                    tool_outputs: toolOutputs
                }

                // Submit the tool outputs back to the API
                await this.client.beta.threads.runs.submitToolOutputs(this.currentThreadId, this.runId, toolOutputsActually);
            }
            else if (runStatus.status === 'completed') {
                // Refresh the thread messages
                await this.loadThreads();
                break; // Exit the loop
            }

            // Sleep for the polling interval before checking again
            await new Promise(resolve => setTimeout(resolve, this.pollingInterval * 1000));
        }

        return this;
    }


    async enableRetrieval(): Promise<this> {
        console.log(`enableRetrieval()`);
        await this.client.beta.assistants.update(this.assistantId!, {
            tools: [{ type: 'retrieval' }],
        })
        this.retrievalEnabled = true;
        return this;
    }

    async upsertFiles(filePaths: string[], attachToAssistant: boolean = false): Promise<string[]> {
        console.log(`upsertFiles(${filePaths}, ${attachToAssistant})`);

        const existingFiles = await this.client.files.list();
        let fileObjects: FileObject[] = [];

        for (const filePath of filePaths) {
            const fileName = filePath.split('/').pop();
            const fileContent = await fs.readFile(filePath);
            const fileExists = existingFiles.data.find(file => file.filename === fileName);

            if (!fileExists || fileExists.bytes !== fileContent.byteLength) {
                const uploadable: Uploadable = await toFile(fileContent, fileName!)
                const fileToCreate: FileCreateParams = {
                    file: uploadable,
                    purpose: 'assistants',
                }
                console.log(`uploadable`, uploadable)
                console.log(`fileToCreate`, fileToCreate)
                const newFile = await this.client.files.create(fileToCreate);

                fileObjects.push(newFile);
            } else {
                fileObjects.push(fileExists);
            }
        }

        if (attachToAssistant && this.assistantId) {
            const fileIds = fileObjects.map(file => file.id);
            console.log(`Attaching files ${JSON.stringify(fileIds)} to assistant ${this.assistantId}`)
            await this.client.beta.assistants.update(this.assistantId, {
                file_ids: fileIds
            });
        }

        return fileObjects.map(file => file.id);
    }

    async getFiles(fileIds?: string[]): Promise<FileObject[]> {
        console.log(`getFiles(${fileIds})`);
        const files = await this.client.files.list();

        console.log(`files`, files)

        if (!fileIds) {
            return files.data
        }

        // filter files by id
        const filteredFiles = files.data.filter(file => fileIds.includes(file.id))

        return filteredFiles
    }

    async getFilesByName(fileNames: string[]): Promise<FileObject[]> {
        // Placeholder implementation
        console.log(`getFilesByName(${fileNames})`);

        const files = await this.client.files.list();

        console.log(`files`, files)

        // filter files by name
        const filteredFiles = files.data.filter(file => fileNames.includes(file.filename))

        console.log(`filteredFiles`, filteredFiles)

        return filteredFiles
    }

    async getFileIdsByName(fileNames: string[]): Promise<string[]> {
        // Placeholder implementation
        console.log(`getFileIdsByName(${fileNames})`);
        return this.getFileIdsByName(fileNames);
    }
}


