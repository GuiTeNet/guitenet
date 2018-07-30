//
// Elementary tensor network operations
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


class ContractionOp
{
	// specify a general tensor contraction operation
	// (convention as in Python's numpy.einsum)

	constructor(tensors, subscripts, outdims, outtensor) {
		if (tensors.length !== subscripts.length) {
			throw new Error('Inconsistent number of tensors for contraction operation.');
		}
		// indices of tensors participating in contraction operation (integer list)
		this.tensors = tensors;
		// subscript labels for each dimension of all tensors (list of integer lists),
		// with to-be contracted dimensions having the same label
		this.subscripts = subscripts;
		// labels of remaining dimensions, specifying the dimension ordering of the contracted output tensor
		this.outdims = outdims;
		// index of output tensor
		this.outtensor = outtensor;
	}

	convertToCanonicalLabels() {
		let firstAppearance = [];

		for (let i = 0; i < this.subscripts.length; i++) {
			for (let j = 0; j < this.subscripts[i].length; j++) {
				let newLabel = firstAppearance.indexOf(this.subscripts[i][j]);
				if (newLabel < 0) {
					// subscript label has not appeared before
					newLabel = firstAppearance.length;
					firstAppearance.push(this.subscripts[i][j]);
				}

				this.subscripts[i][j] = newLabel;
			}
		}

		for (let j = 0; j < this.outdims.length; j++) {
			let newLabel = firstAppearance.indexOf(this.outdims[j]);
			if (newLabel < 0) {
				throw new Error('Contraction output subscript label "' + this.outdims[j] + '" never appeared in input.');
			}

			this.outdims[j] = newLabel;
		}
	}
}


class TranspositionOp {
	// specify a general transposition operation
	// (convention as in Python's numpy.transpose)

	constructor(tensor, perm, outtensor) {
		// index of input tensor
		this.tensor = tensor;
		// permutation order
		// consistency check
		for (let i = 0; i < perm.length; i++) {
			if (perm.indexOf(i) < 0) {
				throw new Error('Invalid permutation array: entry ' + i + ' missing.');
			}
		}
		this.perm = perm;
		// index of output tensor
		this.outtensor = outtensor;
	}
}


class QRDecompositionOp
{
	// specify QR decomposition of a tensor (without permuting dimensions)

	constructor(tensor, ndims, nleftdims, Qtensor, Rtensor) {
		// index of input tensor
		this.tensor = tensor;
		// number of dimensions of input tensor
		if (ndims < 2) {
			throw new Error('Input tensor for QR splitting must have at least 2 dimensions.');
		}
		this.ndims = ndims;
		// number of left (leading) dimensions attributed to the Q tensor
		if (nleftdims < 1) {
			throw new Error('Number of left dimensions for QR splitting must at least be 1.');
		}
		if (nleftdims >= ndims) {
			throw new Error('Number of left dimensions for QR splitting must be smaller than total number of dimensions.');
		}
		this.nleftdims = nleftdims;
		// indices of output Q and R tensors
		this.Qtensor = Qtensor;
		this.Rtensor = Rtensor;
	}
}
