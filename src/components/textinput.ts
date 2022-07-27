import { Actor, AssetContainer, ButtonBehavior, Color3, Context, TextAnchorLocation, User } from "@microsoft/mixed-reality-extension-sdk";
import { DEFAULT_TEXT_COLOR, DEFAULT_TEXT_HEIGHT, ViewElement, ViewElementOptions } from "../core/element";
import { checkUserRole, parseHexColor } from "../helper";

export interface TextInputOptions extends ViewElementOptions {
        resourceId?: string,
        hint?: string,
        prompt?: string,
};

export type TextInputHandler = ((params: { user: User, id: string, text: string }) => void);

export class TextInput extends ViewElement {
        private _text: Actor;
        private hint: string;
        private prompt: string;

        constructor(context: Context, assets: AssetContainer, options: TextInputOptions) {
                super(context, assets, options);
                this.events = [
                        'submitted',
                        'canceled',
                ];

                this.eventParams = {
                        'submitted': ['user', 'text'],
                        'canceled': ['user', 'text'],
                };

                this.hint = (this.options as TextInputOptions).hint !== undefined ? (this.options as TextInputOptions).hint : '';
                this.prompt = (this.options as TextInputOptions).prompt !== undefined ? (this.options as TextInputOptions).prompt : 'input';

                // behavior
                const buttonBehavior = this.anchor.setBehavior(ButtonBehavior);
                // on click
                buttonBehavior.onClick((user, _) => {
                        if (user && this.options.roles) {
                                if (!this.options.roles.every(r => checkUserRole(user, r))) return;
                        }
                        this.handleUIEvent('click', { user, id: this.id });
                        user.prompt(this.prompt, true).then((dialog) => {
                                const event = dialog.submitted ? 'submitted' : 'canceled';
                                this.handleUIEvent(event, { user, id: this.id, text: dialog.text });
                        });
                });

                this.addUIEventHandler('submitted', (params: { user: User, id: string, text: string }) => {
                        const text = params.text ? params.text : '';
                        this.text(text);
                });

                this.anchor.appearance.material = this.assets.materials.find(m => m.name === 'invis');
                // text
                const textHeight = this.dom ? (this.dom.options.textHeight ? parseFloat(this.dom.options.textHeight) : DEFAULT_TEXT_HEIGHT) : DEFAULT_TEXT_HEIGHT;
                const textColor = this.dom ? (this.dom.style.textColor ? parseHexColor(this.dom.style.textColor) : DEFAULT_TEXT_COLOR) : DEFAULT_TEXT_COLOR;
                this._text = Actor.Create(this.context, {
                        actor: Object.assign({
                                parentId: this.anchor.id,
                                text: {
                                        contents: this.text(),
                                        height: textHeight,
                                        anchor: TextAnchorLocation.MiddleCenter,
                                        color: textColor,
                                }
                        }, this.options.exclusive ? { exclusiveToUser: this.options.owner.id } : {})
                });

                this.text('');

                if ((this.options as TextInputOptions).resourceId) {
                        Actor.CreateFromLibrary(this.context, {
                                resourceId: (this.options as TextInputOptions).resourceId,
                                actor: Object.assign({
                                        parentId: this.anchor.id,
                                }, this.options.exclusive ? { exclusiveToUser: this.options.owner.id } : {})
                        });
                }
        }

        public text(t?: string) {
                if (t !== undefined) {
                        if (this.dom) {
                                this.dom.text = t;
                                this._text.text.contents = (t === '' && this.hint ? this.hint : t);
                        }
                } else {
                        return this.dom !== undefined ? this.dom.text : this._text.text.contents;
                }
        }

        public val(v?: string) {
                if (v !== undefined) {
                        this.dom.value = v;
                } else {
                        return this.dom.value;
                }
        }

        public textHeight(h: number) {
                this._text.text.height = h;
        }
}