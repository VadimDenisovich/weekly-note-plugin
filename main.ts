import { Plugin, TFile, TFolder, moment, PluginSettingTab, Setting, App, Notice, TAbstractFile, DropdownComponent } from 'obsidian';

interface WeeklyPluginSettings {
	// Folder to store weekly notes
	weeklyFolder: string;
	// Path to the template file for weekly notes
	// Mutable
	templateFile: string;
}

// Default settings for the plugin
const DEFAULT_SETTINGS: WeeklyPluginSettings = {
	weeklyFolder: 'Mind/Diary',
	templateFile: ''
}

export default class WeeklyPlugin extends Plugin {
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
		const fileName = `(R) ${startOfWeek.format('DD.MM.YY')} - ${endOfWeek.format('DD.MM.YY')}.md`
		const filePath = `${folderPath}/${fileName}`;

		// Сначала проверяем, существует ли уже файл
		let file = this.app.vault.getAbstractFileByPath(filePath);

		if (file instanceof TFile) {
			// Файл уже существует, просто открываем его
			await this.openOrSwitchToFile(file);
			return;
		}

		// Файл не существует, создаем его
		await this.createNewWeeklyFile(folderPath, filePath);
	}

	private async openOrSwitchToFile(file: TFile) {
		// Проверяем, открыт ли файл уже в какой-то вкладке
		let openLeaf = null;
		this.app.workspace.iterateAllLeaves((l) => {
			if ((l.view as any).file && (l.view as any).file.path === file.path) {
				openLeaf = l;
			} 
		});

		if (openLeaf) {
			// Файл уже открыт, переключаемся на эту вкладку
			this.app.workspace.setActiveLeaf(openLeaf);
		} else {
			// Файл не открыт, открываем в новой вкладке
			const leaf = this.app.workspace.getLeaf('tab');
			await leaf.openFile(file);
		}
	}

	private async createNewWeeklyFile(folderPath: string, filePath: string) {
		// Создаем папку, если её нет
		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		if (!folder || !(folder instanceof TFolder)) {
			await this.app.vault.createFolder(folderPath);
		}

		// Получаем содержимое из шаблона
		let content = '';
		if (this.settings.templateFile) {
			try {
				const templateFile = this.app.vault.getAbstractFileByPath(this.settings.templateFile);
				if (templateFile instanceof TFile) {
					content = await this.app.vault.read(templateFile);
				} else {
					new Notice(`Template file not found: ${this.settings.templateFile}`);
				}
			} catch (error) {
				new Notice(`Error reading template file: ${error}`);
				return;
			}
		}

		// Создаем файл
		const file = await this.app.vault.create(filePath, content) as TFile;
		
		// Открываем созданный файл
		await this.openOrSwitchToFile(file);
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
		private currentPath: string = '';
		private dropdownEl: HTMLElement | null = null;
    plugin: WeeklyPlugin;

    constructor(app: App, plugin: WeeklyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

		private createFileSelector(inputEl: HTMLElement) {
			console.log('Creating file selector'); // Debug

			const wrapper = inputEl.parentElement;
			if (wrapper) {
				this.dropdownEl = wrapper.createDiv('file-selector-dropdown');
				// style.display set a CSS prop to make dropdown invisible
				// and clear from document flow 
				//
				// Document flow —  это способ, которым браузер 
				// располагает элементы на странице один за другим в нормальном порядке чтения.
				this.dropdownEl.style.display = 'none';
			}

			// Style for dropdown list 
			wrapper?.addClass('file-selector-container');
			const styleEl = document.createElement('style');
			styleEl.textContent = `
            .file-selector-container {
                position: relative;
                width: 100%;
            }
            .file-selector-input {
                width: 100%;
                padding: 5px;
            }
            .file-selector-dropdown {
                position: absolute;
                top: 100%;
                left: 0;
                width: 100%;
                max-height: 200px;
                overflow-y: auto;
                background: var(--background-primary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
                z-index: 1000;
            }
            .file-item {
                padding: 5px 10px;
                cursor: pointer;
            }
            .file-item:hover {
                background: var(--background-modifier-hover);
            }
            .folder-item {
                color: var(--text-muted);
            }
            .file-item-md {
                color: var(--text-normal);
            }
        `;
			document.head.appendChild(styleEl);

			// Handle click on input
			inputEl.addEventListener('click', () => {
				console.log('Input clicked'); // Debug
				this.currentPath = this.plugin.settings.templateFile; 
				this.updateFileList(this.currentPath); 
				if (this.dropdownEl) this.dropdownEl.style.display = 'block';
			})

			// CClosing a dropdown list when clicking outside of it
			document.addEventListener('click', (e) => {
				console.log('Document clicked'); // Debug
				if (!wrapper?.contains(e.target as Node) && this.dropdownEl) {
					this.dropdownEl.style.display = 'none';
				}
			})

		}

		private updateFileList(currentPath: string) {
			if (!this.dropdownEl) return; 

			console.log('Current path:', currentPath); // Debug
			this.dropdownEl.empty();
			
			const currentFolder = currentPath 
				? this.app.vault.getAbstractFileByPath(currentPath) 
				: this.app.vault.getRoot() // get the root folder of current vauld

			console.log('Current folder:', currentFolder); // Debug

			// const input = this.dropdownEl.parentElement?.querySelector('input');
			// if (input && this.currentPath) {
			// 	input.value = currentPath + '/';
			// }

			// if (currentPath) {
			// 	const backItem = this.dropdownEl.createDiv('file-item folder-item');
			// 	backItem.textContent = '..';
			// 	backItem.addEventListener('click', () => {
			// 		const parentPath = currentPath.split('/').slice(0, -1).join('/');
			// 		this.currentPath = parentPath; 
			// 		console.log('Going back to:', this.currentPath); // Debug
			// 		if (input) { 
			// 			input.value = parentPath ? parentPath + '/' : '';
			// 		}
			// 		this.updateFileList(parentPath);
			// 	});
			// }

			if (currentFolder instanceof TFolder) {
				currentFolder.children.sort((a, b) => {
						// Sort folder below files 
						if (a instanceof TFolder && !(b instanceof TFolder)) return -1; 
						if (!(a instanceof TFolder) && b instanceof TFolder) return 1; 
						return a.name.localeCompare(b.name);
				}).forEach(file => {
					const item = this.dropdownEl?.createDiv('file-item');
					if (item) {
						item.textContent = file.name; 
					}

					if (file instanceof TFolder) {
						item?.addClass('folder-item');
						item?.addEventListener('click', () => {
							const input = this.dropdownEl?.parentElement?.querySelector('input');
							console.log('Clicked folder:', file.path); // Debug
							if (input instanceof HTMLInputElement) {
								this.currentPath = file.path;
								input.value = file.path;
								input.dispatchEvent(new Event('input'));
								console.log('Navigating to folder:', this.currentPath); // Debug
								console.log(`templateFile = ${this.plugin.settings.templateFile}`); // Debug
								this.updateFileList(this.currentPath);
							}
						})
					} else if (file instanceof TFile && file.extension === 'md') {
						item?.addClass('file-item-md');
						item?.addEventListener('click', () => {
								const input = this.dropdownEl?.parentElement?.querySelector('input');
								if (input instanceof HTMLInputElement) {
									input.value = file.path;
									input.dispatchEvent(new Event('input'));
									console.log(`templateFile = ${this.plugin.settings.templateFile}`)
								}
								if (this.dropdownEl) {
									this.dropdownEl.style.display = 'none';
								}
						});
					}
				});
			}
		}

		// For clean dropdownEl
    private cleanup() {
			if (this.dropdownEl) {
					this.dropdownEl.remove();
					this.dropdownEl = null;
			}
		}

    display(): void {
				console.log('Display called'); // Debug
				// Clean old dropdownEl
				this.cleanup();

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
                }));

				new Setting(containerEl)
					.setName('Weekly Notes Template')
					.setDesc('Template file for weekly notes')
					.addText(text => {
						this.createFileSelector(text.inputEl);
						return text
						.setPlaceholder('Enter template file path')
						.setValue(this.plugin.settings.templateFile)
						.onChange(async (value) => {
							this.plugin.settings.templateFile = value;
							await this.plugin.saveSettings();
						})
				});

				new Setting(containerEl)
					.addButton(button => button
						.setButtonText('Save')
						.setCta()
						.onClick(async () => {
							await this.plugin.saveSettings();
							new Notice('Settings saved');
						}));
	}

	// Called when the settings are hidden
	hide(): void {
			this.cleanup();
			super.hide();
	}
}