import { AssetContainer, Context, User } from "@microsoft/mixed-reality-extension-sdk";
import { Button, ButtonOptions } from "./button";

// Checkbox
export interface CheckboxOptions extends ButtonOptions {
        checked?: string,
        unchecked?: string,
}

export class Checkbox extends Button {
        private _checked: boolean = null;

        get checked() { return this._checked; }
        set checked(c: boolean) {
                if (this._checked == c) { return; }
                this._checked = c;
                this.dom.style.asset = this.checked ?
                        (this.options as CheckboxOptions).checked :
                        (this.options as CheckboxOptions).unchecked;
                this.refreshStyle();
        }

        constructor(context: Context, assets: AssetContainer, options: CheckboxOptions) {
                super(context, assets, options);
                this.events = [
                        'click',
                        'checked',
                ];
                this.eventParams = {
                        'click': ['user', 'id'],
                        'checked': ['user', 'id'],
                };
                this.addUIEventHandler('click', (param: { user: User, id: string }) => {
                        this.checked = !this.checked;
                        this.val(this.checked ? 'true' : 'false');
                        this.handleUIEvent('checked', Object.assign(param, { checked: this.checked }));
                });

                this.checked = false;
        }

        public val(v?: string) {
                if (v !== undefined) {
                        if (['true', 'false'].includes(v)) {
                                this.checked = v == 'true' ? true : false;
                                this.value = v;
                        }
                } else {
                        return this.value;
                }
        }
}
