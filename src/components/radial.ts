import { Actor, AssetContainer, ColliderType, CollisionLayer, Color3, Context, ScaledTransformLike } from "@microsoft/mixed-reality-extension-sdk";
import { ViewElement, ViewElementOptions } from "../core/element";
import { translate } from "../helper";

// Radial
export interface RadialOptions extends ViewElementOptions {
    camera: {
        resourceId: string,
        transform?: Partial<ScaledTransformLike>,
    },
    input: {
        dimensions: {
            width: number, height: number, depth: number,
        },
        transform?: Partial<ScaledTransformLike>,
    }
}

export class Radial extends ViewElement {
    private camera: Actor;
    private input: Actor;

    constructor(context: Context, assets: AssetContainer, options: RadialOptions) {
        super(context, assets, options);

        this.events = [];

        this.eventParams = {}

        this.createCamera();
        this.createInput();
    }

    private createCamera() {
        const options = (this.options as RadialOptions);
        const local = translate(options.camera.transform ? options.camera.transform : {}).toJSON();
        this.camera = Actor.CreateFromLibrary(this.context, {
            resourceId: (this.options as RadialOptions).camera.resourceId,
            actor: Object.assign({
                parentId: this.anchor.id,
                transform: {
                    local
                }
            }, this.options.exclusive ? { exclusiveToUser: this.options.owner.id } : {})
        });
    }

    private createInput() {
        const options = (this.options as RadialOptions);
        const local = translate(options.input.transform ? options.input.transform : {}).toJSON();
        const dim = (this.options as RadialOptions).input.dimensions;
        let mesh = this.assets.meshes.find(m => m.name === 'radial_input_mesh');
        if (!mesh) {
            mesh = this.assets.createBoxMesh('radial_input_mesh', dim.width, dim.height, dim.depth);
        }
        const name = `radial_input_material_${this.options.exclusive ? this.owner.id : ''}`;
        let material = this.assets.materials.find(m => m.name === name);
        if (!material) {
            material = this.assets.createMaterial(name, {
                color: Color3.Black(),
                emissiveColor: Color3.Black(),
            });
        }

        this.input = Actor.Create(this.context, {
            actor: Object.assign({
                parentId: this.anchor.id,
                appearance: {
                    meshId: mesh.id,
                    materialId: material.id,
                },
                transform: {
                    local
                },
                collider: {
                    geometry: { shape: ColliderType.Box },
                    layer: CollisionLayer.Hologram
                }
            }, this.options.exclusive ? { exclusiveToUser: this.options.owner.id } : {})
        });
    }

    public val(v?: string) {
        if (v !== undefined) {
            this.dom.value = v;
            this.input?.appearance.material.emissiveColor.copy({ r: parseFloat(v), g: 0, b: 0 });
        } else {
            return this.dom.value;
        }
    }

    public remove() {
    }
}