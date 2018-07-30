//
// Utility functions
//
//
// MIT License
//
// Copyright (c) 2018 Christian B. Mendl
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.


'use strict';


function mergeOverlapping(lists)
{
	let sets = [];
	for (let i = 0; i < lists.length; i++)
	{
		sets.push(new Set(lists[i]));
	}

	let merged = [];
	while (sets.length > 0)
	{
		let x = sets[0];
		let newsets = [];
		for (let i = 1; i < sets.length; i++) {
			// intersection of x and sets[i]
			let isect = new Set([...x].filter(z => sets[i].has(z)));
			if (isect.size > 0) {
				x = new Set([...x, ...sets[i]]);
			}
			else {
				newsets.push(sets[i]);
			}
		}
		merged.push([...x].sort());
		sets = newsets;
	}

	return merged;
}


function deepCopy(o) {
	// see https://www.codementor.io/avijitgupta/deep-copying-in-js-7x6q8vh5d

	var output, v, key;
	output = Array.isArray(o) ? [] : {};
	for (key in o) {
		v = o[key];
		output[key] = (typeof v === "object") ? deepCopy(v) : v;
	}
	return output;
}
