import { Actor, AssetContainer, ColliderType, CollisionLayer, Color3, Context, DegreesToRadians, Material, Quaternion, ScaledTransformLike, TextAnchorLocation, User } from "@microsoft/mixed-reality-extension-sdk";
import { checkUserRole, translate } from "../helper";
import { DOMElement } from "./dom";
import { AssetData } from "./style";
import { View } from "./view";

export const DEFAULT_TEXT_HEIGHT = 0.03;
export const DEFAULT_TEXT_ANCHOR = TextAnchorLocation.MiddleCenter;
export const DEFAULT_TEXT_COLOR = Color3.White();
export const DEFAULT_TEXT_JUSTIFY = "left";
export const DEFAULT_TEXT_FONT = "default";

export interface ViewElementOptions {
    view: View,
    dom: DOMElement,
    parent?: ViewElement,
    enabled?: boolean,
    material?: Material,
    exclusive?: boolean,
    owner?: User,
    stylus?: Actor,
    dimensions?: { width: number, height: number, depth: number },
    transform?: Partial<ScaledTransformLike>,
    hidden?: boolean,
    assets?: { [name: string]: AssetData },
    roles?: string[],
}

export type ViewElementEventHandler = (...args: any) => void;

export class ViewElement {
    // dom meta
    public dom: DOMElement;
    get id() { return this.dom.id; }
    get class() { return this.dom.class; }
    get tag() { return this.dom.tag; }
    get value() { return this.dom.value; }

    set id(i: string) { this.dom.id = i; }
    set class(c: string) { this.dom.class = c; }
    set tag(t: string) { this.dom.tag = t; }
    set value(v: string) { this.dom.value = v; }

    public owner: User;
    public stylus: Actor;

    // hierarchy
    public view: View;
    public parent: ViewElement;
    public children: ViewElement[];

    public val(v?: string): (string | void) { }
    public text(t?: string): (string | void) { }

    public anchor: Actor;
    protected _asset: Actor;

    public events: string[] = [];
    public eventParams: { [event: string]: string[] } = {};
    private handlers: Map<string, ViewElementEventHandler[]>;

    constructor(protected context: Context, protected assets: AssetContainer, public options: ViewElementOptions) {
        this.dom = options.dom;
        this.view = options.view;
        this.parent = options.parent;

        this.owner = options.owner;
        this.stylus = options.stylus;

        this.handlers = new Map<string, ViewElementEventHandler[]>();

        // anchor
        const transform = options.transform ? options.transform : {};
        const transformLike = translate(transform).toJSON();
        const dim = options.dimensions;

        let appearance;
        if (dim) {
            const sig = `${dim.width},${dim.height},${dim.depth}`;
            let mesh = assets.meshes.find(m => m.name === sig);
            if (!mesh) {
                mesh = assets.createBoxMesh(sig, dim.width, dim.height, dim.depth);
            }
            appearance = {
                enabled: this.options.hidden ? false : true,
                meshId: mesh.id,
                materialId: options.material ? options.material.id : assets.materials.find(m => m.name === 'invis').id,
            };
        } else {
            appearance = {
                enabled: this.options.hidden ? false : true,
            };
        }

        this.anchor = Actor.Create(context, {
            actor: Object.assign({
                parentId: options.parent ? options.parent.anchor.id : null,
                transform: {
                    local: transformLike
                },
                appearance,
                collider: {
                    enabled: options.enabled ? options.enabled : false,
                    geometry: { shape: ColliderType.Box },
                    layer: CollisionLayer.Hologram
                }
            },
                options.exclusive ? { exclusiveToUser: options.owner.id } : {}
            )
        });

        this.refreshStyle();
    }

    public refresh(context: Context, assets: AssetContainer, options: ViewElementOptions) {
        // anchor
        const pos = options.transform.position;
        const dim = options.dimensions;
        if (!dim) { return; }

        const sig = `${dim.width},${dim.height},${dim.depth}`;
        let mesh = assets.meshes.find(m => m.name === sig);
        if (!mesh) {
            mesh = assets.createBoxMesh(sig, dim.width, dim.height, dim.depth);
        }

        this.anchor.transform.local.position.copyFromFloats(pos.x, pos.y, pos.z);
        this.anchor.appearance.meshId = mesh.id;

        // asset
        const a = this.dom.style.asset;
        const asset = a ? options.assets[a] : undefined;
        if (asset) {
            const d = asset.dimensions;
            this._asset.transform.local.scale.copyFromFloats(
                dim.width / d.width,
                dim.height / d.height,
                dim.depth / d.depth,
            );
        }

        // update values
        this.val(this.dom.value);
        this.text(this.dom.text);
        this.refreshStyle();

        return this;
    }

    public refreshStyle() {
        const a = this.dom.style.asset;
        if (!this._asset && !a || this._asset && this._asset.name == a) { return; }
        this._asset?.destroy();

        const dim = this.options.dimensions;

        const asset = a ? this.options.assets[a] : undefined;
        if (asset) {
            const d = asset.dimensions;
            const z = this.dom.options.z !== undefined ? this.dom.options.z : 0;
            const offset = asset.offset ? asset.offset : { x: 0, y: 0, z: 0 };
            const r = asset.rotation ? asset.rotation : { x: 0, y: 0, z: 0 };
            const position = { x: offset.x, y: offset.y, z: offset.z + z }
            this._asset = Actor.CreateFromLibrary(this.context, {
                resourceId: asset.resourceId,
                actor: {
                    name: a,
                    parentId: this.anchor.id,
                    transform: {
                        local: {
                            position,
                            rotation: Quaternion.FromEulerAngles(r.x * DegreesToRadians, r.y * DegreesToRadians, r.z * DegreesToRadians),
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

    public addUIEventHandler(event: string, handler: ViewElementEventHandler) {
        if (!this.events.includes(event)) { return; }
        if (!this.handlers.has(event)) {
            this.handlers.set(event, [handler]);
        }
        else {
            this.handlers.get(event).push(handler);
        }
    }

    public removeUIEventHandler(event: string) {
        this.handlers.delete(event);
    }

    public handleUIEvent(event: string, param: any) {
        if (param.user && this.options.roles) {
            if (!this.options.roles.every(r => checkUserRole(param.user, r))) return;
        }
        const handlers = this.handlers.get(event);
        handlers?.forEach(handler => {
            handler(param);
        });
        if (this.parent) {
            this.parent.handleUIEvent(event, param);
        }
    }

    public disable() {
        this.children.forEach(c => c.disable());
        this.anchor.collider.enabled = false;
        this.anchor.appearance.enabled = false;
    }

    public enable() {
        this.children.forEach(c => c.enable());
        this.anchor.collider.enabled = true;
        this.anchor.appearance.enabled = true;
    }

    public enabled() {
        return this.anchor.appearance.enabled;
    }

    public find(selector: string) {
        const elements: ViewElement[] = [];
        this.findHelper(selector, this, elements);
        return elements;
    }

    private findHelper(selector: string, root: ViewElement, elements: ViewElement[]) {
        const [first, ...r] = selector.split(' ');
        const rest = r.length > 0 ? r.join(' ') : '';

        if (first[0] == '#') {
            const name = first.slice(1);
            selector = root.id == name ? rest : selector;
        } else if (first[0] == '.') {
            const cls = first.slice(1);
            selector = root.class == cls ? rest : selector;
        } else {
            selector = root.tag == first ? rest : selector;
        }

        if (!selector) {
            elements.push(root);
            // return;
            selector = first;
        }

        root.children?.forEach(child => {
            this.findHelper(selector, child, elements);
        });
    }

    public rendered() {
    }

    public update(xml: string, render: boolean = true) {
        const dom = new DOMElement(xml);
        this.dom.update(dom);
        if (render) this.render();
    }

    public insert(xml: string, index: number, render: boolean = true) {
        const dom = this.dom.insert(xml, index, render);
        if (render) this.view.render();
        return dom.element;
    }

    public append(xml: string, render: boolean = true) {
        const dom = this.dom.append(xml, render);
        if (render) this.view.render();
        return dom.element;
    }

    public prepend(xml: string, render: boolean = true) {
        const dom = this.dom.prepend(xml, render);
        if (render) this.view.render();
        return dom.element;
    }

    public sibling(xml: string, index: number, render: boolean = true) {
        const dom = this.dom.sibling(xml, index, render);
        if (render) this.view.render();
        return dom.element;
    }

    public after(xml: string, render: boolean = true) {
        const dom = this.dom.after(xml, render);
        if (render) this.view.render();
        return dom.element;
    }

    public before(xml: string, render: boolean = true) {
        const dom = this.dom.before(xml, render);
        if (render) this.view.render();
        return dom.element;
    }

    public remove(render: boolean = true) {
        this.dom.remove(render);

        this.children.forEach(child => {
            child.remove(render);
        });
        this.anchor.destroy();

        if (render) this.view.render();
    }

    public clear() {
        this.children.forEach(c => c.remove(false));
        this.view.render();
    }

    public render() {
        this.dom.calc();
        this.view.render();
    }

    public reattach() {
    }
}