/*!
 * Copyright (c) The Free MRE Foundation. All rights reserved.
 * Licensed under the MIT License.
 */

import { User, ScaledTransform, ScaledTransformLike, Quaternion, DegreesToRadians, Color3 } from "@microsoft/mixed-reality-extension-sdk";
import fetch from "node-fetch";

export async function fetchText(url: string) {
	const res = await fetch(url);
	const text = await res.text();
	return text;
}

export function translate(transformLike: Partial<ScaledTransformLike>) {
	const pos = transformLike.position ? transformLike.position : { x: 0, y: 0, z: 0 };
	const rot = transformLike.rotation ? transformLike.rotation : { x: 0, y: 0, z: 0 };
	const scale = transformLike.scale ? transformLike.scale : { x: 1, y: 1, z: 1 };
	const transform = new ScaledTransform();
	transform.copy({
		position: pos,
		rotation: Quaternion.FromEulerAngles(
			rot.x * DegreesToRadians,
			rot.y * DegreesToRadians,
			rot.z * DegreesToRadians
		),
		scale,
	});
	return transform;
}

export function translateBack(transformLike: Partial<ScaledTransformLike>) {
	const pos = transformLike.position ? transformLike.position : { x: 0, y: 0, z: 0 };
	const rot = transformLike.rotation ? transformLike.rotation : { x: 0, y: 0, z: 0 };
	const scale = transformLike.scale ? transformLike.scale : { x: 1, y: 1, z: 1 };
	const transform = new ScaledTransform();
	const q = new Quaternion(rot.x, rot.y, rot.z, rot.w);
	const e = q.toEulerAngles();
	transform.copy({
		position: pos,
		rotation: {
			x: e.x / DegreesToRadians,
			y: e.y / DegreesToRadians,
			z: e.z / DegreesToRadians,
		},
		scale,
	});
	return transform;
}

export function parseHexColor(color: string) {
	const r = parseInt(`0x${color.substr(1, 2)}`) / 256;
	const g = parseInt(`0x${color.substr(3, 2)}`) / 256;
	const b = parseInt(`0x${color.substr(5, 2)}`) / 256;
	return new Color3(r, g, b);
}

export function checkUserRole(user: User, role: string) {
	if (user.properties['altspacevr-roles'] === role ||
		user.properties['altspacevr-roles'].includes(role)) {
		return true;
	}
	return false;
}