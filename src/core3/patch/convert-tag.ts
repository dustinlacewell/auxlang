/**
 * A unit-tagged value meets a port: the port converts it to its own unit.
 * Same unit → the value as-is. A constant folds at bind time. A signal (or a
 * constant with no fold, like beats) gets a converter node that runs per
 * sample. A tag with no conversion to the port's unit is a loud error naming
 * both units.
 */

import type { GNode, InputValue } from "../graph/node";
import type { PortAnn } from "../types";
import { conversionFor, convertibleTo } from "../units/conversions";
import type { UnitTag } from "../units/tag";
import { lift } from "./lift";

export function convertTag(tag: UnitTag, ann: PortAnn, where: string): InputValue {
	const value = lift(tag.def, where);
	if (tag.unit === ann.unit) return value;
	const conversion = conversionFor(tag.unit, ann.unit);
	if (conversion === null) throw noConversionError(tag, ann, where);
	if (typeof value === "number" && conversion.fold)
		return folded(conversion.fold(value), tag, where);
	const node: GNode = { module: conversion.module, inputs: { in: value }, config: {} };
	return { node, port: "out" };
}

function folded(value: number, tag: UnitTag, where: string): number {
	if (!Number.isFinite(value)) {
		throw new Error(
			`${where}: ${tag.unit}(${String(tag.def)}) has no finite value in this port's unit`,
		);
	}
	return value;
}

function noConversionError(tag: UnitTag, ann: PortAnn, where: string): Error {
	const targets = convertibleTo(tag.unit);
	const into = targets.length > 0 ? targets.join(", ") : "nothing";
	return new Error(
		`${where}: cannot convert ${tag.unit} to ${ann.unit}. This port takes ${ann.unit}; ` +
			`a ${tag.unit}() value converts only to ${into}.`,
	);
}
