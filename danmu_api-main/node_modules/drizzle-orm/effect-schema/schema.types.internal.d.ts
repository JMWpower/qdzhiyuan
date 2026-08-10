import { ColumnIsGeneratedAlwaysAs, GetSelection } from "../utils.js";
import { GetEffectSchemaType, HandleColumn } from "./column.types.js";
import { Table } from "../table.js";
import { Column } from "../column.js";
import { Assume, DrizzleTypeError, Simplify } from "../utils.js";
import { View } from "../sql/sql.js";
import { Schema } from "effect";
import { Struct, Top, UndefinedOr } from "effect/Schema";
import { SelectedFieldsFlat } from "../operations.js";

//#region src/effect-schema/schema.types.internal.d.ts
interface Conditions {
  never: (column?: Column) => boolean;
  optional: (column: Column) => boolean;
  nullable: (column: Column) => boolean;
}
type BuildRefineField<T> = T extends Top ? ((schema: T) => Top) | Top : never;
type BuildRefine<TColumns extends Record<string, any>> = { [K in keyof TColumns as TColumns[K] extends Column | SelectedFieldsFlat<Column> | Table | View ? K : never]?: TColumns[K] extends Column ? BuildRefineField<GetEffectSchemaType<TColumns[K]>> : BuildRefine<GetSelection<TColumns[K]>> };
type HandleRefinement<TType extends 'select' | 'insert' | 'update', TRefinement, TColumn extends Column> = TRefinement extends (((schema: any) => infer R extends Top)) ? (TColumn['_']['notNull'] extends true ? R : (Schema.NullOr<R>)) extends infer TSchema extends Top ? TType extends 'update' ? Schema.optional<UndefinedOr<TSchema>> : TSchema : typeof Schema.Any : TRefinement;
type IsRefinementDefined<TRefinements extends Record<string | symbol | number, any> | undefined, TKey extends string | symbol | number> = TRefinements extends object ? TRefinements[TKey] extends Top | Schema.optional<Top> | Schema.optionalKey<Top> | ((schema: any) => any) ? true : false : false;
type BuildSchema<TType extends 'select' | 'insert' | 'update', TColumns extends Record<string, any>, TRefinements extends Record<string, any> | undefined> = Struct<Simplify<{ readonly [K in keyof TColumns as ColumnIsGeneratedAlwaysAs<TColumns[K]> extends true ? TType extends 'select' ? K : never : K]: TColumns[K] extends infer TColumn extends Column ? IsRefinementDefined<TRefinements, K> extends true ? Assume<HandleRefinement<TType, TRefinements[K & keyof TRefinements], TColumn>, Top | Schema.optional<Top> | Schema.optionalKey<Top>> : HandleColumn<TType, TColumn> : TColumns[K] extends infer TObject extends SelectedFieldsFlat<Column> | Table | View ? BuildSchema<TType, GetSelection<TObject>, TRefinements extends object ? TRefinements[K & keyof TRefinements] : undefined> : typeof Schema.Any }>>;
type NoUnknownKeys<TRefinement extends Record<string, any>, TCompare extends Record<string, any>> = { [K in keyof TRefinement]: K extends keyof TCompare ? TRefinement[K] extends Record<string, Top> ? NoUnknownKeys<TRefinement[K], TCompare[K]> : TRefinement[K] : DrizzleTypeError<`Found unknown key in refinement: "${K & string}"`> };
//#endregion
export { BuildRefine, BuildSchema, Conditions, NoUnknownKeys };
//# sourceMappingURL=schema.types.internal.d.ts.map