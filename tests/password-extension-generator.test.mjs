import test from "node:test";
import assert from "node:assert/strict";
import { generatePassword } from "../browser-extension/generator.js";
test("secure generator returns requested length and all required character classes",()=>{
  const values=new Set();
  for(const length of [12,16,24,32,48,128]){
    for(let i=0;i<20;i++){
      const value=generatePassword(length);assert.equal(value.length,length);
      assert.match(value,/[A-Z]/);assert.match(value,/[a-z]/);assert.match(value,/[2-9]/);assert.match(value,/[!@#$%&*+\-=?_]/);
      values.add(value);
    }
  }
  assert.equal(values.size,120);
});
test("invalid generator lengths rejected",()=>{for(const n of [0,11,129,1.5,NaN,"24"])assert.throws(()=>generatePassword(n));});
