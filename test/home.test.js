import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('weekly recaps use Monday boundaries across Sundays and year changes',()=>{const context=vm.createContext({});vm.runInContext(readFileSync(new URL('../public/home.js',import.meta.url),'utf8'),context);assert.equal(context.weekStart('2026-10-12'),'2026-10-12');assert.equal(context.weekStart('2026-10-18'),'2026-10-12');assert.equal(context.weekStart('2027-01-01'),'2026-12-28');assert.equal(context.addDays('2026-12-28',7),'2027-01-04');});
