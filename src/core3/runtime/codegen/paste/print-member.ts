/**
 * A field read or write in a pasted function. A named field of an object
 * parameter (`s.phase`, `i.cutoff`, `o.out`, `cfg.mode`) becomes the local
 * standing in for it; in a tick, a math cache slot (`__mc[3]`) becomes its
 * lane's local; `Math.PI` stays host math; any other access prints as an
 * access on the printed object, its property re-spelled from a checked
 * identifier or as a JSON key.
 */

import type { MemberExpression } from "acorn";
import { cacheSlotOf } from "../../../module/bind-math/cache-names";
import { refuse } from "./not-pasteable";
import type { PasteContext } from "./paste-context";
import { printExpression } from "./print-expression";
import { printName } from "./print-name";

const PLAIN_PROPERTY = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function printMember(node: MemberExpression, ctx: PasteContext, write: boolean): string {
	if (node.optional) refuse("optional chaining is not pasteable");
	const slot = ctx.cacheSlot === null ? null : cacheSlotOf(node);
	if (slot !== null && ctx.cacheSlot !== null) return ctx.cacheSlot(slot);
	const named = namedField(node);
	if (named !== null) {
		const field = roleField(named.owner, named.field, ctx, write);
		if (field !== null) return field;
	}
	const object =
		node.object.type === "Identifier"
			? printName(node.object.name, ctx)
			: node.object.type === "Super"
				? refuse("super is not pasteable")
				: `(${printExpression(node.object, ctx)})`;
	if (node.computed) return `${object}[${printExpression(node.property, ctx)}]`;
	if (node.property.type !== "Identifier") return refuse("private names are not pasteable");
	return `${object}${propertyAccess(node.property.name)}`;
}

/** `Math.<name>` for a pasted call or read; `name` must be a real Math member. */
export function mathMember(name: string): string {
	if (!PLAIN_PROPERTY.test(name) || !Object.hasOwn(Math, name))
		refuse(`Math.${name} is not a Math member`);
	return `Math.${name}`;
}

function namedField(node: MemberExpression): { owner: string; field: string } | null {
	if (node.computed || node.object.type !== "Identifier" || node.property.type !== "Identifier")
		return null;
	return { owner: node.object.name, field: node.property.name };
}

function roleField(owner: string, field: string, ctx: PasteContext, write: boolean): string | null {
	const roles = ctx.roles;
	const fields = ctx.fields;
	if (owner === "Math" && !ctx.locals.has("Math")) {
		if (write) refuse("Math is read-only");
		if (field === "random") refuse("Math.random is pasteable only as a call");
		return mathMember(field);
	}
	if (fields === null) return null;
	if (owner === roles.state) return fields.state(field, write);
	if (write && (owner === roles.ins || owner === roles.config))
		refuse("inputs and config are read-only");
	if (owner === roles.ins) return fields.input(field);
	if (owner === roles.outs) return fields.output(field);
	if (owner === roles.config) return fields.config(field);
	return null;
}

function propertyAccess(name: string): string {
	return PLAIN_PROPERTY.test(name) ? `.${name}` : `[${JSON.stringify(name)}]`;
}
