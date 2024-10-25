import { Plugin, TFile, TFolder, moment, PluginSettingTab, Setting, App, Notice } from 'obsidian';

interface WeeklyPluginSettings {
	weeklyFolder: string;
}

const DEFAULT_SETTINGS: WeeklyPluginSettings = {
	weeklyFolder: 'Mind/Diary'
}

export default class WeeklyPlugin extends Plugin{
	settings: WeeklyPluginSettings;
	private ribbonIconEl: HTMLElement;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new WeeklyPluginSettingTab(this.app, this)); 

		this.addCommand({
			id: 'create-weekly-note',
			name: 'Create Weekly Note',
			callback: () => {
				this.createWeeklyNote()
			}
		});

		this.ribbonIconEl = this.addRibbonIcon('calendar-days', 'Weekly Note',
			(evt: MouseEvent) => {
				this.createWeeklyNote();
			});
	}

	async createWeeklyNote() {
		const startOfWeek = moment().startOf('isoWeek');
		const endOfWeek = moment().endOf('isoWeek');
		
		const folderPath = this.settings.weeklyFolder;
		const folder = this.app.vault.getAbstractFileByPath(folderPath);

		if (!folder || !(folder instanceof TFolder)) {
			await this.app.vault.createFolder(folderPath);
		}

		const fileName = `(R) ${startOfWeek.format('DD.MM.YY')} - ${endOfWeek.format('DD.MM.YY')}.md`
		const filePath = `${folderPath}/${fileName}`;

		let file = this.app.vault.getAbstractFileByPath(filePath);

		if (!file || !(file instanceof TFile)) {
			file = await this.app.vault.create(filePath, '');
		}

		let isOpened = false;
		this.app.workspace.iterateAllLeaves((l) => {
			if ((l.view as any).file && (l.view as any).file.path === file.path) {
				isOpened = true;
			} 
		});

		if (file instanceof TFile && !isOpened) {
			let leaf = this.app.workspace.getLeaf('tab');
			leaf.openFile(file);
		}
	}	

	async onunload() {
		if (this.ribbonIconEl) {
			this.ribbonIconEl.remove();
		}
	} 

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class WeeklyPluginSettingTab extends PluginSettingTab {
    plugin: WeeklyPlugin;

    constructor(app: App, plugin: WeeklyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h1', { text: 'Settings for Weekly Plugin' });

        new Setting(containerEl)
            .setName('Weekly Notes Folder')
            .setDesc('Folder to store weekly notes')
            .addText(text => text
                .setPlaceholder('Enter folder name')
                .setValue(this.plugin.settings.weeklyFolder)
                .onChange(async (value) => {
                    this.plugin.settings.weeklyFolder = value;
                }))
			.addButton(button => button
				.setButtonText('Save')
				.setCta()
				.onClick(async () => {
					await this.plugin.saveSettings();
					new Notice('Settings saved');
				}));
}
}