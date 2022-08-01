import { Actor, Animation, AnimationEaseCurves, AssetContainer, ButtonBehavior, Context, User } from "@microsoft/mixed-reality-extension-sdk";
import { PixelsToMeters } from "../core/dom";
import { ViewElement, ViewElementOptions } from "../core/element";
import { checkUserRole } from "../helper";

const MIN_CLICK_INTERVAL = 300;
// Button
export interface SliderOptions extends ViewElementOptions {
        disabled?: boolean,
        animate?: boolean,
        puck?: {
                asset: string,
                width: number,
                height: number,
        },
        mask?: {
                asset: string,
                underlay: string,
        }
}

export type SliderState = "pressed" | "holding" | "released";
export type SliderTriggerHandler = ((params: { user: User, id: string }) => void);
export class Slider extends ViewElement {
        private puck: Actor;
        private mask: Actor;
        private underlay: Actor;

        constructor(context: Context, assets: AssetContainer, options: SliderOptions) {
                super(context, assets, options);

                this.events = [
                        'click',
                ];

                this.eventParams = {
                        'click': ['user', 'id', 'percent'],
                }

                // behavior
                const buttonBehavior = this.anchor.setBehavior(ButtonBehavior);
                // on click
                buttonBehavior.onClick((user, data) => {
                        if (user && this.options.roles) {
                                if (!this.options.roles.every(r => checkUserRole(user, r))) return;
                        }
                        const width = this.dom.layout.dimensions.width;
                        const percent = (data.targetedPoints[0].localSpacePoint.x + width / 2) / width;
                        const disabled = (this.options as SliderOptions).disabled;
                        if (disabled === undefined || disabled == false) {
                                this.val(`${percent}`);
                                this.handleUIEvent('click', { user, id: this.id, percent });
                        }
                });

                // puck
                if ((this.options as SliderOptions).puck) {
                        const resourceId = this.options.assets[(this.options as SliderOptions).puck.asset].resourceId;
                        const d = this.options.assets[(this.options as SliderOptions).puck.asset].dimensions;
                        const dim = { width: (this.options as SliderOptions).puck.width * PixelsToMeters, height: (this.options as SliderOptions).puck.height * PixelsToMeters };
                        this.puck = Actor.CreateFromLibrary(this.context, {
                                resourceId,
                                actor: Object.assign({
                                        parentId: this.anchor.id,
                                        transform: {
                                                local: {
                                                        scale: { x: dim.width / d.width, y: dim.height / d.height, z: 1 },
                                                }
                                        }
                                }, this.options.exclusive ? { exclusiveToUser: this.options.owner.id } : {})
                        });
                }

                // mask
                if ((this.options as SliderOptions).mask) {
                        let resourceId = this.options.assets[(this.options as SliderOptions).mask.asset].resourceId;
                        this.mask = Actor.CreateFromLibrary(this.context, {
                                resourceId,
                                actor: Object.assign({
                                        parentId: this.anchor.id,
                                        transform: {
                                                local: {
                                                        position: {
                                                                x: -this.dom.layout.dimensions.width / 2, y: 0, z: 0
                                                        },
                                                        scale: {
                                                                x: 1, y: 1, z: 1
                                                        }
                                                }
                                        }
                                }, this.options.exclusive ? { exclusiveToUser: this.options.owner.id } : {})
                        });

                        resourceId = this.options.assets[(this.options as SliderOptions).mask.underlay].resourceId;
                        const scale = this._asset.transform.local.scale;
                        this.underlay = Actor.CreateFromLibrary(this.context, {
                                resourceId,
                                actor: {
                                        parentId: this.anchor.id,
                                        transform: {
                                                local: {
                                                        scale
                                                }
                                        }
                                }
                        });
                }

                this.val('0');
        }

        public val(v?: string) {
                if (v !== undefined) {
                        const value = Math.max(Math.min(parseFloat(v), 1), 0);
                        const width = this.dom.layout.dimensions.width;

                        this.dom.value = `${value}`;
                        if (this.puck) {
                                const px = (value - 0.5) * width;
                                if ((this.options as SliderOptions).animate) {
                                        const p = this.puck.transform.local.position;
                                        Animation.AnimateTo(this.context, this.puck, {
                                                destination: {
                                                        transform: {
                                                                local: {
                                                                        position: {
                                                                                x: px, y: p.y, z: p.z
                                                                        }
                                                                },
                                                        },
                                                },
                                                duration: 0.01,
                                                easing: AnimationEaseCurves.Linear
                                        });
                                } else {
                                        this.puck.transform.local.position.x = px;
                                }
                        }
                        if (this.mask) {
                                const mask = this.options.assets[(this.options as SliderOptions).mask.asset];
                                const width = mask.dimensions.width / 2;
                                const w = this.dom.layout.dimensions.width;
                                this.mask.transform.local.scale.x = w * value / width;
                        }
                } else {
                        return this.dom.value;
                }
        }

        set asset(a: string) {
                const dim = this.dom.layout.dimensions;
                const asset = a ? this.options.assets[a] : undefined;
                this.dom.style.asset = a;
                if (asset) {
                        const d = asset.dimensions;
                        const z = this.dom.options.z !== undefined ? this.dom.options.z : 0;
                        const offset = asset.offset ? asset.offset : { x: 0, y: 0, z: 0 };
                        const position = { x: offset.x, y: offset.y, z: offset.z + z }
                        if (this._asset) { this._asset.destroy(); }
                        this._asset = Actor.CreateFromLibrary(this.context, {
                                resourceId: asset.resourceId,
                                actor: {
                                        parentId: this.anchor.id,
                                        transform: {
                                                local: {
                                                        position,
                                                        scale: {
                                                                x: dim.width / d.width,
                                                                y: dim.height / d.height,
                                                                z: dim.depth / d.depth,
                                                        }
                                                }
                                        }
                                },
                        });
                }
        }

        public refresh(context: Context, assets: AssetContainer, options: ViewElementOptions) {
                super.refresh(context, assets, options);
                const scale = this._asset.transform.local.scale;
                this.underlay?.transform.local.scale.copy(scale);
                return this;
        }
}