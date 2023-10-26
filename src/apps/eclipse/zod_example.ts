import z from 'zod';

// See documentation at https://github.com/colinhacks/zod

// Declare something equivalent to
// interface A {
//   p: string;
//   q: number
// }
const A = z.object({
  p: z.string(),
  q: z.number(),
});
type A = z.infer<typeof A>;

// Declare something equivalent to
// type E = 'one' | 'two' | 'three'
// Note there are lots of other ways to do enums in TypeScript and Zod.
const E = z.enum(['one', 'two', 'three']);
type E = z.infer<typeof E>;

// Declare something equivalent to
// interface B {
//   r: A[];
//   s: E
// }
const B = z.object({
  r: z.array(A),
  s: E,
});
type B = z.infer<typeof B>;

// parsing
console.log('------------');
const a = B.parse({
  r: [
    {p: 'hi', q: 1},
    {p: 'there', q: 2},
  ],
  s: 'one',
}); // => OK - returns type.
console.log(JSON.stringify(a));

// "safe" parsing (doesn't throw error if validation fails)
console.log('------------');
const b = B.safeParse({
  r: [
    {p: 'hi', q: 1},
    {p: 'there', q: 2},
  ],
  s: 'one',
}); // => OK - returns type { success: true, data: B }
console.log(JSON.stringify(b));

console.log('------------');
const c = B.parse({
  r: [
    {p: true, q: 1},
    {p: 'there', q: 2},
  ],
  s: 'one',
}); // => Fails because r.p is the wrong type
console.log(JSON.stringify(c));

function foo(x: B) {
  console.log(x);
}
