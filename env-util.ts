// Simple .env parser and writer for Obsidian plugins

import { App, TFile } from 'obsidian';

export async function readEnvFile(app: App, envPath: string): Promise<Record<string, string>> {
    try {
        const file = app.vault.getAbstractFileByPath(envPath);
        if (!file) return {};
        const content = await app.vault.read(file as TFile);
        const lines = content.split(/\r?\n/);
        const env: Record<string, string> = {};
        for (const line of lines) {
            const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
            if (match) {
                env[match[1]] = match[2];
            }
        }
        return env;
    } catch (e) {
        return {};
    }
}

export async function writeEnvFile(app: App, envPath: string, envObj: Record<string, string>): Promise<void> {
    const lines = Object.entries(envObj).map(([k, v]) => `${k}=${v}`);
    let file = app.vault.getAbstractFileByPath(envPath);
    if (!file) {
        file = await app.vault.create(envPath, lines.join('\n'));
    } else {
        await app.vault.modify(file as TFile, lines.join('\n'));
    }
}
