///////////////////////////////////////////////////////////////////////////////
//
// JSON-serializable type
//
///////////////////////////////////////////////////////////////////////////////
export type Primitive = boolean | number | string | undefined | null | Date;
export type Field = POJO | Primitive | Array<Field> | undefined;

// Plain old JavaScript object. JSON Serializable.
export type POJO = {[key: string]: Field};
