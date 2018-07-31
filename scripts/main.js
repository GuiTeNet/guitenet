//
// Main file responsible for visualization and transforming user actions
// into intermediate elementary tensor network operations
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


// select the SVG canvas
let svg = d3.select('#guitenetSvg');

// define gradient for SVG buttons
function defineButtonGradient() {
	let defs = svg.append('defs');

	let gradient = defs.append('linearGradient')
		.attr('id', 'buttonGradient')
		.attr('x1', '0%')
		.attr('x2', '0%')
		.attr('y1', '0%')
		.attr('y2', '100%');

	gradient.append('stop')
		.attr('offset', '0%')
		.attr('stop-color', '#F7F7F7');

	gradient.append('stop')
		.attr('offset', '100%')
		.attr('stop-color', '#DDDDDD');
}

defineButtonGradient();


// select the element displaying the generated code
let genCode = d3.select('#guitenetCode');

// collect operations for code generation
let ops = [];


const gridspacing = 20;

function generateGridLines()
{
	const width  = Number(svg.attr('width'));
	const height = Number(svg.attr('height'));

	let grid = svg.append('g').attr('id', 'grid');

	for (let i = 0; i <= Math.floor(width / gridspacing); i++) {
		grid.append('line')
			.attr('class', 'gridLine')
			.attr('x1', gridspacing * i)
			.attr('y1', 0)
			.attr('x2', gridspacing * i)
			.attr('y2', height);
	}

	for (let i = 0; i <= Math.floor(height / gridspacing); i++) {
		grid.append('line')
			.attr('class', 'gridLine')
			.attr('x1', 0)
			.attr('y1', gridspacing * i)
			.attr('x2', width)
			.attr('y2', gridspacing * i);
	}
}

generateGridLines();

let gridEnabled = true;

function snapGrid(x, y) {

	if (gridEnabled) {
		// closest grid points
		let x_grid = gridspacing * Math.round(x / gridspacing);
		let y_grid = gridspacing * Math.round(y / gridspacing);

		let dx = x - x_grid;
		let dy = y - y_grid;
		if (dx * dx + dy * dy < 15) {
			x = x_grid;
			y = y_grid;
		}
	}

	return [x, y];
}


// tensor and tensor leg groups (for ensuring that legs always appear behind tenors)
let tensorLegs = svg.append('g').attr('id', 'tensorLegs');
let tensors = svg.append('g').attr('id', 'tensors');


// define the div for the tooltip
let tooltipDiv = d3.select('body').append('div')
	.attr('class', 'tooltip')
	.style('opacity', 0)
	.style('display', 'none');

function tooltipMouseout()
{
	tooltipDiv
		.style('opacity', 0)
		.style('display', 'none');
}


let buttonContract = svg.append('g')
	.attr('class', 'svgButton')
	.attr('transform', 'translate(10,' + (svg.attr('height') - 35) + ')')
	.on('click', performContraction)
	.style('display', 'none');
buttonContract.append('rect')
	.attr('class', 'svgButtonRect')
	.attr('width',  74)
	.attr('height', 25);
buttonContract.append('text')
	.attr('class', 'svgButtonText')
	.attr('dx', 37)
	.attr('dy', 18)
	.text('Contract');


let tensorCount = 0;
let legCount    = 0;

const TENSOR_RADIUS = 20;

function createTensor(x, y, legIds)
{
	// create new tensor (storing coordinates additionally as 'x' and 'y' attributes);
	// 'legIds' are ordered according to tensor dimensions
	let tensor = tensors.append('g')
		.datum({ id: tensorCount, legIds: legIds })
		.attr('id', 'T' + tensorCount)
		.attr('class', 'tensor')
		.attr('x', x)
		.attr('y', y)
		.attr('transform', 'translate(' + x + ',' + y + ')')
		.call(d3.drag()
			.on('start', tensorDragStarted)
			.on('drag',  tensorDragged)
			.on('end',   tensorDragEnded))
		.on('contextmenu', tensorContextMenu)
		.on('mouseover', function (d) {
			tooltipDiv
				.transition()
				.delay(500)
				.duration(500)
				.style('opacity', 1);
			tooltipDiv
				.html('Shift + drag to add leg, Right-click to split')
				.style('display', null)
				.style('left', (d3.event.pageX + 15) + 'px')
				.style('top',  (d3.event.pageY - 20) + 'px');
		})
		.on('mouseout', tooltipMouseout);
	tensor.append('circle')
		.attr('class', 'tensorSymbol')
		.attr('cx', 0)
		.attr('cy', 0)
		.attr('r', TENSOR_RADIUS);
	tensor.append('text')
		.attr('class', 'tensorCaption')
		.attr('dy', 5)
		.text(function (d) { return d.id; });

	// return tensor ID
	return tensorCount++;
}

function createTensorLeg(x1, y1, x2, y2, tid, tensorOrd) {
	let leg = tensorLegs.append('g')
		.datum({ id: legCount, tensorId: tid, tensorOrd: tensorOrd })
		.attr('id', 'L' + legCount)
		.attr('class', 'tensorLeg');
	leg.append('line')
		.attr('class', 'tensorLegLine')
		.attr('x1', x1)
		.attr('y1', y1)
		.attr('x2', x2)
		.attr('y2', y2);
	leg.append('text')
		.attr('class', 'tensorLegLabel')
		.attr('x', x1)
		.attr('y', y1)
		.text(function (d) { return d.tensorOrd; });
	leg.append('circle')
		.attr('class', 'tensorLegTip')
		.attr('cx', x2)
		.attr('cy', y2)
		.attr('r', 6)
		.call(d3.drag()
			.on('start', legDragStarted)
			.on('drag',  legDragged)
			.on('end',   legDragEnded))
		.on('mouseover', function (d) {
			tooltipDiv
				.transition()
				.delay(500)
				.duration(500)
				.style('opacity', 1);
			tooltipDiv
				.html('Snap to other leg to schedule contraction')
				.style('display', null)
				.style('left', (d3.event.pageX + 15) + 'px')
				.style('top',  (d3.event.pageY - 20) + 'px');
		})
		.on('mouseout', tooltipMouseout);

	// return leg ID
	return legCount++;
}


// create additional tensor on drag
const ADD_TENSOR_X = 20;
const ADD_TENSOR_Y = 20;
let addTensor = svg.append('g')
	.attr('id', 'addTensor')
	.attr('transform', 'translate(' + ADD_TENSOR_X + ',' + ADD_TENSOR_Y + ')')
	.call(d3.drag()
		.on('drag', addTensorDragged)
		.on('end',  addTensorDragEnded))
	.on('mouseover', function (d) {
		tooltipDiv
			.transition()
			.delay(500)
			.duration(500)
			.style('opacity', 1);
		tooltipDiv
			.html('Drag to add tensor')
			.style('display', null)
			.style('left', (d3.event.pageX + 15) + 'px')
			.style('top',  (d3.event.pageY - 20) + 'px');
	})
	.on('mouseout', tooltipMouseout);
addTensor.append('circle')
	.attr('id', 'addTensorSymbol')
	.attr('cx', 0)
	.attr('cy', 0)
	.attr('r', TENSOR_RADIUS);
addTensor.append('text')
	.attr('id', 'addTensorCaption')
	.attr('dy', 5)
	.text('+');

function addTensorDragged() {
	let [x, y] = snapGrid(d3.event.x, d3.event.y);
	d3.select(this)
		.attr('transform', 'translate(' + x + ',' + y + ')');
}

function addTensorDragEnded()
{
	// reset 'add tensor' position
	d3.select(this)
		.attr('transform', 'translate(' + ADD_TENSOR_X + ',' + ADD_TENSOR_Y + ')');

	let [x, y] = snapGrid(d3.event.x, d3.event.y);
	createTensor(x, y, []);
}


function legLabelCoords(c1, c2)
{
	let dir = [c2[0] - c1[0], c2[1] - c1[1]];
	let nrm = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1]);
	if (nrm > 0) {
		dir[0] /= nrm;
		dir[1] /= nrm;
	}

	return [
		c1[0] + (TENSOR_RADIUS + 10) * dir[0],
		c1[1] + (TENSOR_RADIUS + 10) * dir[1]];
}


function checkContractionReady()
{
	// check whether contraction can be performed by probing whether there are any overlapping leg tips

	let numLegs = 0;

	// union of leg tip coordinates
	const width = Number(svg.attr('width'));
	let tipSet = new Set();
	d3.selectAll('.tensorLeg')
		.each(function (d) {
			numLegs++;
			let curCircle = d3.select(this).select('circle');
			let x = Number(curCircle.attr('cx'));
			let y = Number(curCircle.attr('cy'));
			// convert coordinates to single numbers to be used as 'Set' keys
			tipSet.add(x + width * y);
		});

	return tipSet.size < numLegs;
}


function snapLegTip(legId, x, y)
{
	// collect tip coordinates of all other legs (as snap targets)
	let otherLegIds = [];
	let otherLegCoords = [];
	d3.selectAll('.tensorLeg')
		.filter(function (d) { return d.id !== legId; })
		.each(function (d) {
			otherLegIds.push(d.id);
			let curCircle = d3.select(this).select('circle');
			otherLegCoords.push([curCircle.attr('cx'), curCircle.attr('cy')]);
		});

	// try snapping to other leg tips
	let snap = false;
	for (let i = 0; i < otherLegCoords.length; i++) {
		let dx = x - otherLegCoords[i][0];
		let dy = y - otherLegCoords[i][1];
		if (dx * dx + dy * dy < 50) {
			x = otherLegCoords[i][0];
			y = otherLegCoords[i][1];
			snap = true;
		}
	}

	return { x: x, y: y, snap: snap };
}


let moveTensor;

function tensorDragStarted(tdatum) {
	if (d3.event.sourceEvent.shiftKey) {
		moveTensor = false;
	}
	else {
		moveTensor = true;
	}

	if (!moveTensor) {
		// create new tensor leg
		// enforce integer coordinates for leg tip (to identify joined legs using integer arithmetic)
		let [x, y] = snapGrid(Math.round(d3.event.x), Math.round(d3.event.y));
		let legId = createTensorLeg(this.getAttribute('x'), this.getAttribute('y'), x, y,
			tdatum.id, tdatum.legIds.length);

		// add reference to new leg
		tdatum.legIds.push(legId);
	}
}

function tensorDragged(tdatum)
{
	if (moveTensor)
	{
		const [x, y] = snapGrid(d3.event.x, d3.event.y);

		this.setAttribute('x', x);
		this.setAttribute('y', y);
		this.setAttribute('transform', 'translate(' + x + ',' + y + ')');

		// update tensor leg coordinates
		for (let lid of tdatum.legIds)
		{
			let leg = d3.select('#L' + lid);
			if (leg.empty()) { throw Error('Leg with ID ' + lid + ' not found.'); }

			let curLine = leg.select('line');
			curLine
				.attr('x1', x)
				.attr('y1', y);
			let x2 = Number(curLine.attr('x2'));
			let y2 = Number(curLine.attr('y2'));
			let llc = legLabelCoords([x, y], [x2, y2]);
			leg.select('text')
				.attr('x', llc[0])
				.attr('y', llc[1]);
		}
	}
	else
	{
		// move recently created leg

		const legIds = tdatum.legIds;
		let leg = d3.select('#L' + legIds[legIds.length - 1]);
		if (leg.empty()) { throw Error('Leg with ID ' + legIds[legIds.length - 1] + ' not found.'); }

		// update currently dragged tensor leg coordinates

		let x1 = Number(leg.select('line').attr('x1'));
		let y1 = Number(leg.select('line').attr('y1'));

		// enforce integer coordinates for leg tip (to identify joined legs using integer arithmetic)
		let [x2, y2] = snapGrid(Math.round(d3.event.x), Math.round(d3.event.y));

		// try snapping to other leg tips
		let s = snapLegTip(leg.datum().id, x2, y2);
		x2 = s.x;
		y2 = s.y;
		// mark if snapped
		if (s.snap) {
			leg.select('circle').attr('class', 'tensorLegTipSnap');
		}
		else {
			leg.select('circle').attr('class', 'tensorLegTip');
		}

		// line
		leg.select('line')
			.attr('x2', x2)
			.attr('y2', y2);
		// leg id label
		let llc = legLabelCoords([x1, y1], [x2, y2]);
		leg.select('text')
			.attr('x', llc[0])
			.attr('y', llc[1]);
		// tip
		leg.select('circle')
			.attr('cx', x2)
			.attr('cy', y2);

		if (s.snap || checkContractionReady()) {
			buttonContract.style('display', null);
		}
		else {
			buttonContract.style('display', 'none');
		}
	}
}

function tensorDragEnded() {
}


function legDragStarted() {
	// TODO: moveToFront()
}

function legDragged(d)
{
	// datum inherited from tensor leg

	// enforce integer coordinates for leg tip (to identify joined legs using integer arithmetic)
	let [x, y] = snapGrid(Math.round(d3.event.x), Math.round(d3.event.y));

	// try snapping to other leg tips
	let s = snapLegTip(d.id, x, y);
	x = s.x;
	y = s.y;
	// mark if snapped
	if (s.snap) {
		this.setAttribute('class', 'tensorLegTipSnap');
	}
	else {
		this.setAttribute('class', 'tensorLegTip');
	}

	// update tensor leg coordinates

	// current selection is circle tip of leg
	this.setAttribute('cx', x);
	this.setAttribute('cy', y);

	let curLine = d3.select(this.parentNode).select('line');
	// end point of line
	curLine
		.attr('x2', x)
		.attr('y2', y);
	// leg id label
	let x1 = Number(curLine.attr('x1'));
	let y1 = Number(curLine.attr('y1'));
	let llc = legLabelCoords([x1, y1], [x, y]);
	d3.select(this.parentNode).select('text')
		.attr('x', llc[0])
		.attr('y', llc[1]);

	if (s.snap || checkContractionReady()) {
		buttonContract.style('display', null);
	}
	else {
		buttonContract.style('display', 'none');
	}
}

function legDragEnded() {
}


function performContraction()
{
	// union of leg tip coordinates
	const width = Number(svg.attr('width'));
	let tipSet = new Set();
	d3.selectAll('.tensorLeg')
		.each(function (d) {
			let curCircle = d3.select(this).select('circle');
			let x = Number(curCircle.attr('cx'));
			let y = Number(curCircle.attr('cy'));
			// convert coordinates to single numbers to be used as 'Set' keys
			tipSet.add(x + width * y);
		});

	// tensor legs, grouped together according to joined tips
	let legGroups = [];
	for (let c of tipSet.keys()) {
		// convert back to 2D coordinates
		let x = c % width;
		let y = Math.floor(c / width);
		let curGroup = [];
		d3.selectAll('.tensorLeg')
			.select('circle')
			.each(function (d) {
				if (x === Number(this.getAttribute('cx')) && y === Number(this.getAttribute('cy'))) {
					curGroup.push(d);
				}
			});
		if (curGroup.length > 1) {
			legGroups.push(curGroup);
		}
	}
	console.log('legGroups:', legGroups);

	// overwrite legIds with smallest leg ID within each leg group (for specifying contraction operation),
	// and mark joined legs as to-be deleted from tensor
	for (let group of legGroups) {
		if (group.length <= 1) {
			throw new Error('To-be joined leg group must contain at least two legs.');
		}

		let minId = group[0].id;
		for (let d of group) {
			minId = Math.min(minId, d.id);
		}

		for (let d of group)
		{
			// find tensor corresponding to leg
			let tensor = d3.select('#T' + d.tensorId);
			if (tensor.empty()) { throw new Error('Tensor with ID ' + d.tensorId + ' not found.'); }

			let tdatum = tensor.datum();
			const i = tdatum.legIds.indexOf(d.id);
			if (i < 0) { throw new Error('Leg ID ' + d.id + ' in tensor ' + d.tensorId + ' not found.'); }
			// overwrite with smallest leg ID
			tdatum.legIds[i] = minId;

			// create temporary list of to-be deleted legs
			if (!('legDel' in tdatum)) {
				tdatum.legDel = new Array(tdatum.legIds.length).fill(false);
			}
			// mark leg as to-be deleted from tensor
			tdatum.legDel[i] = true;
		}
	}

	// remove joined legs from DOM
	for (let group of legGroups) {
		if (group.length <= 1) {
			throw new Error('To-be joined leg group must contain at least two legs.');
		}

		for (let d of group)
		{
			let leg = d3.select('#L' + d.id);
			if (leg.empty()) { throw new Error('Leg with ID ' + d.id + ' not found.'); }
			// remove current leg
			leg.remove();
		}
	}

	// group tensors according to joined legs (does not include isolated tensors)
	let tensorGroups = [];
	for (let group of legGroups) {
		// extract corresponding tensor IDs
		let tg = [];
		for (let d of group) {
			tg.push(d.tensorId);
		}
		tensorGroups.push(tg);
	}
	tensorGroups = mergeOverlapping(tensorGroups);
	console.log('tensorGroups:', tensorGroups);

	for (let group of tensorGroups)
	{
		console.log('current tensor group:', group);

		// determine center position (as location for new tensor)
		let x_ctr = 0;
		let y_ctr = 0;
		for (let tid of group) {
			let tensor = d3.select('#T' + tid);
			if (tensor.empty()) { throw new Error('Tensor with ID ' + tid + ' not found.'); }

			x_ctr += Number(tensor.attr('x'));
			y_ctr += Number(tensor.attr('y'));
		}
		// use integer coordinates to allow for later modulo arithmetic
		x_ctr = Math.round(x_ctr / group.length);
		y_ctr = Math.round(y_ctr / group.length);
		// also snap to grid
		[x_ctr, y_ctr] = snapGrid(x_ctr, y_ctr);

		// for constructing contraction operation
		let subscripts = [];
		let outdims = [];

		// ensure that ordering of tensors (sorted by tensor ID) is preserved
		for (let tid of group) {
			let tensor = d3.select('#T' + tid);
			if (tensor.empty()) { throw new Error('Tensor with ID ' + tid + ' not found.'); }

			let tdatum = tensor.datum();
			// to-be joined legs have same ID
			subscripts.push(tdatum.legIds);
			for (let i = 0; i < tdatum.legIds.length; i++) {
				if (!tdatum.legDel[i]) {

					outdims.push(tdatum.legIds[i]);

					let leg = d3.select('#L' + tdatum.legIds[i]);
					if (leg.empty()) { throw new Error('Leg with ID ' + tdatum.legIds[i] + ' not found.'); }

					// update reference to new tensor
					leg.datum().tensorId = tensorCount;
					leg.datum().tensorOrd = outdims.length - 1;

					let curLine = leg.select('line');
					curLine
						.transition()
						.attr('x1', x_ctr)
						.attr('y1', y_ctr);
					let x2 = Number(curLine.attr('x2'));
					let y2 = Number(curLine.attr('y2'));
					let llc = legLabelCoords([x_ctr, y_ctr], [x2, y2]);
					leg.select('text')
						.text(function (d) { return d.tensorOrd; })
						.transition()
						.attr('x', llc[0])
						.attr('y', llc[1]);
				}
			}

			// tensors with temporary "to-be deleted" leg labels will be removed anyway

			// transition to center coordinate and remove tensor afterwards
			tensor
				.transition()
				.attr('x', x_ctr)
				.attr('y', y_ctr)
				.attr('transform', 'translate(' + x_ctr + ',' + y_ctr + ')')
				.remove();
		}

		// actually create new tensor
		let tid = createTensor(x_ctr, y_ctr, outdims);
		let newTensor = d3.select('#T' + tid);
		if (newTensor.empty()) { throw new Error('Tensor with ID ' + tid + ' not found.'); }

		// fade-in
		newTensor
			.attr('opacity', 0)
			.transition()
				.attr('opacity', 1);

		// contraction operation
		let cop = new ContractionOp(deepCopy(group), deepCopy(subscripts), deepCopy(outdims), tid);
		cop.convertToCanonicalLabels();
		console.log('cop:', cop);

		ops.push(cop);
	}

	// all current contractions should now be completed
	buttonContract.style('display', 'none');

	let code = generatePythonCode(ops);
	console.log('generated Python code:');
	console.log(code);

	genCode.html(code);
}


function performTransposition(tid, perm) {

	// fast return if perm is identity permutation
	let identityPerm = true;
	for (let i = 0; i < perm.length; i++) {
		if (perm[i] !== i) {
			identityPerm = false;
			break;
		}
	}
	if (identityPerm) {
		return tid;
	}

	// consistency check
	for (let i = 0; i < perm.length; i++) {
		if (perm.indexOf(i) < 0) {
			throw new Error('Invalid permutation array: entry ' + i + ' missing.');
		}
	}

	let tensor = d3.select('#T' + tid);
	if (tensor.empty()) { throw new Error('Tensor with ID ' + tid + ' not found.'); }

	let legIds = tensor.datum().legIds;
	if (legIds.length !== perm.length) {
		throw new Error('Permutation array length does not agree with number of legs.');
	}
	// permute leg IDs
	let permLegIds = [];
	for (let i = 0; i < legIds.length; i++) {
		permLegIds[i] = legIds[perm[i]];
	}

	const x = tensor.attr('x');
	const y = tensor.attr('y');

	// remove original tensor
	tensor.remove();

	// transposed tensor is formally a new tensor
	let tidNew = createTensor(x, y, permLegIds);

	// update leg references to new tensor
	for (let i = 0; i < permLegIds.length; i++) {
		let leg = d3.select('#L' + permLegIds[i]);
		if (leg.empty()) { throw new Error('Leg with ID ' + permLegIds[i] + ' not found.'); }

		leg.datum().tensorId = tidNew;
		leg.datum().tensorOrd = i;
		leg.select('text')
			.text(function (d) { return d.tensorOrd; });
	}

	// add transposition operation
	ops.push(new TranspositionOp(tid, perm, tidNew));

	// update generated code
	let code = generatePythonCode(ops);
	console.log('generated Python code:');
	console.log(code);

	genCode.html(code);

	return tidNew;
}


const TOGGLE_GRID_KEY_CODE = 71;

window.onkeydown = function (e) {
	if (e.keyCode === TOGGLE_GRID_KEY_CODE) {
		gridEnabled = !gridEnabled;

		if (gridEnabled) {
			d3.select('#grid').attr('display', null);
		}
		else {
			d3.select('#grid').attr('display', 'none');
		}
	}
};


function tensorContextMenu(d) {
	d3.event.preventDefault();

	// TODO: show actual context menu to select between SVD and QR splitting

	splitTensorQR(d);
}


function splitTensorQR(tdatum) {

	const numlegs = tdatum.legIds.length;

	let tensor = d3.select('#T' + tdatum.id);
	const x_base = Number(tensor.attr('x')) + 25;
	const y_base = Number(tensor.attr('y')) + 25;

	if (numlegs < 2) {
		svg.append('text')
			.attr('class', 'infoMessage')
			.attr('dx', x_base)
			.attr('dy', y_base)
			.text('Need at least 2 legs for splitting operation')
			.transition()
			.delay(2000)
				.style('opacity', 0)
				.remove();
		return;
	}

	// ensure that tooltip disappears
	tooltipMouseout();

	// overlay
	svg.append('rect')
		.attr('id', 'splitOverlay')
		.attr('width', svg.attr('width'))
		.attr('height', svg.attr('height'))
		.on('click', removeSplitOperationElements);

	const LABEL_DISTANCE = 40;

	svg.append('rect')
		.attr('id', 'splitCanvas')
		.attr('x', x_base - 20)
		.attr('y', y_base - 20)
		.attr('width', Math.max(numlegs * LABEL_DISTANCE, 165))
		.attr('height', 110)
		.attr('rx', 5)
		.attr('ry', 5);

	svg.selectAll('.permLabel')
		.data(Array.from(Array(numlegs).keys()))
		.enter()
		.append('text')
		.attr('id', function (d, i) { return 'I' + i; })
		.attr('class', 'permLabel')
		.attr('transform', function (d, i) { return 'translate(' + (x_base + LABEL_DISTANCE * i) + ',' + y_base + ')'; })
		.text(function (d) { return d; });

	svg.selectAll('.swapArrow')
		.data(Array(numlegs - 1)) // only require index
		.enter()
		.append('text')
		.attr('class', 'swapArrow')
		.attr('transform', function (d, i) { return 'translate(' + (x_base + LABEL_DISTANCE * (i + 0.5)) + ',' + y_base + ')'; })
		.text('\u2194')
		.on('click', function (d, i) {

			let IL = d3.select('#I' + i);
			if (IL.empty()) { throw Error('Label with ID I' + i + ' not found.'); }

			let IR = d3.select('#I' + (i + 1));
			if (IR.empty()) { throw Error('Label with ID I' + (i + 1) + ' not found.'); }

			// swap datum (index)
			const dL = IL.datum();
			IL.datum(IR.datum());
			IR.datum(dL);

			// update shown text according to indices
			d3.selectAll('.permLabel')
				.text(function (d) { return d; });
		});

	function sliderDragEnded(d) {
		let nleftdims = d.nleftdims;
		// transition to arrow centers
		let x = d3.event.x;
		let min_dist = 1000;
		for (let i = 0; i < numlegs - 1; i++) {
			let x_arrow = x_base + LABEL_DISTANCE * (i + 0.5);
			let dx = Math.abs(d3.event.x - x_arrow);
			if (dx < min_dist) {
				nleftdims = i + 1;
				x = x_arrow;
				min_dist = dx;
			}
		}
		d.nleftdims = nleftdims;
		d3.select(this)
			.transition()
			.duration(500)
			.attr('transform', 'translate(' + x + ',' + y_base + ')');
	}

	let splitSlider = svg.append('g')
		.attr('id', 'splitSlider')
		.datum({ nleftdims: 1 })
		.attr('transform', 'translate(' + (x_base + 0.5 * LABEL_DISTANCE) + ',' + y_base + ')')
		.call(d3.drag()
			.on('drag', function () { d3.select(this).attr('transform', 'translate(' + d3.event.x + ',' + y_base + ')'); })
			.on('end', sliderDragEnded));
	splitSlider.append('line')
		.attr('id', 'splitSliderSeparator')
		.attr('x1', 0)
		.attr('y1', 5)
		.attr('x2', 0)
		.attr('y2', 30);
	splitSlider.append('text')
		.attr('id', 'splitSliderCaption')
		.attr('dy', 30)
		.text('Q R');

	let buttonPerformSplit = svg.append('g')
		.attr('class', 'svgButton')
		.attr('id', 'buttonPerformSplit')
		.attr('transform', 'translate(' + (x_base - 5) + ',' + (y_base + 50) + ')')
		.on('click', function () {
			// permutation array for tensor dimensions
			let perm = new Array(numlegs);
			svg.selectAll('.permLabel')
				.each(function (d, i) { perm[i] = d; });
			// number of left (leading) dimensions attributed to the Q tensor
			let nleftdims = splitSlider.datum().nleftdims;
			// clean up GUI elements
			removeSplitOperationElements();
			// splitting operation consists of transposition followed by actual decomposition
			let tidTranspose = performTransposition(tdatum.id, perm);
			performQRDecomposition(tidTranspose, nleftdims);
		});
	buttonPerformSplit.append('rect')
		.attr('class', 'svgButtonRect')
		.attr('width', 60)
		.attr('height', 28);
	buttonPerformSplit.append('text')
		.attr('class', 'svgButtonText')
		.attr('dx', 30)
		.attr('dy', 19)
		.text('Split');

	let buttonCancelSplit = svg.append('g')
		.attr('class', 'svgButton')
		.attr('id', 'buttonCancelSplit')
		.attr('transform', 'translate(' + (x_base + 70) + ',' + (y_base + 50) + ')')
		.on('click', removeSplitOperationElements);
	buttonCancelSplit.append('rect')
		.attr('class', 'svgButtonRect')
		.attr('width', 60)
		.attr('height', 28);
	buttonCancelSplit.append('text')
		.attr('class', 'svgButtonText')
		.attr('dx', 30)
		.attr('dy', 19)
		.text('Cancel');

	function removeSplitOperationElements() {
		d3.selectAll('.permLabel').remove();
		d3.selectAll('.swapArrow').remove();
		buttonPerformSplit.remove();
		buttonCancelSplit.remove();
		splitSlider.remove();
		splitCanvas.remove();
		splitOverlay.remove();
	}
}


function performQRDecomposition(tid, nleftdims)
{
	let tensor = d3.select('#T' + tid);
	if (tensor.empty()) { throw new Error('Tensor with ID ' + tid + ' not found.'); }

	// copy original leg IDs
	const origLegIds = tensor.datum().legIds.slice();

	if (nleftdims < 1) {
		throw new Error('Number of left dimensions for QR splitting must at least be 1.');
	}
	if (nleftdims >= origLegIds.length) {
		throw new Error('Number of left dimensions for QR splitting must be smaller than total number of dimensions.');
	}

	// use integer coordinates such that bond leg tips (see below) likewise have integer coordinates
	const x_ref = Math.round(Number(tensor.attr('x')));
	const y_ref = Math.round(Number(tensor.attr('y')));

	// remove original tensor
	tensor.remove();

	const width = Number(svg.attr('width'));

	// move the new tensors horizontally away from the original tensor
	const idQ = createTensor(Math.max(x_ref - 80, 0),         y_ref, origLegIds.slice(0, nleftdims));
	const idR = createTensor(Math.min(x_ref + 80, width - 1), y_ref, origLegIds.slice(nleftdims));

	let tensorQ = d3.select('#T' + idQ);
	let tensorR = d3.select('#T' + idR);

	// briefly show labels for the Q and R tensors
	svg.append('text')
		.attr('class', 'infoMessage')
		.attr('dx', Number(tensorQ.attr('x')) + 20)
		.attr('dy', Number(tensorQ.attr('y')) - 20)
		.style('text-anchor', 'middle')
		.text('Q')
		.transition()
			.delay(2000)
			.style('opacity', 0)
			.remove();
	svg.append('text')
		.attr('class', 'infoMessage')
		.attr('dx', Number(tensorR.attr('x')) - 20)
		.attr('dy', Number(tensorR.attr('y')) - 20)
		.style('text-anchor', 'middle')
		.text('R')
		.transition()
			.delay(2000)
			.style('opacity', 0)
			.remove();

	let tdatumQ = tensorQ.datum();
	let tdatumR = tensorR.datum();

	if (tdatumQ.legIds.length !== nleftdims)                     { throw new Error('Consistency check for number of legs failed.'); }
	if (tdatumR.legIds.length !== origLegIds.length - nleftdims) { throw new Error('Consistency check for number of legs failed.'); }

	// append bond leg to Q tensor
	let legIdBondQ = createTensorLeg(tensorQ.attr('x'), tensorQ.attr('y'),
		Math.max(x_ref - 20, 0), y_ref, idQ, tdatumQ.legIds.length);
	tdatumQ.legIds.push(legIdBondQ);

	// prepend bond leg to R tensor
	let legIdBondR = createTensorLeg(tensorR.attr('x'), tensorR.attr('y'),
		Math.min(x_ref + 20, width - 1), y_ref, idR, 0);
	tdatumR.legIds.unshift(legIdBondR);

	// update leg references to new Q tensor (last "bond" leg actually already referencing new Q tensor)
	for (let i = 0; i < tdatumQ.legIds.length; i++) {
		let leg = d3.select('#L' + tdatumQ.legIds[i]);
		if (leg.empty()) { throw new Error('Leg with ID ' + tdatumQ.legIds[i] + ' not found.'); }

		let ldatum = leg.datum();

		ldatum.tensorId = idQ;
		if (ldatum.tensorOrd !== i) {
			throw new Error('Leg tensor ordering consistency check failed, observing ' + ldatum.tensorOrd + ', expecting ' + i + '.');
		}

		const x = Number(tensorQ.attr('x'));
		const y = Number(tensorQ.attr('y'));
		let curLine = leg.select('line');
		curLine
			.attr('x1', x)
			.attr('y1', y);
		let x2 = Number(curLine.attr('x2'));
		let y2 = Number(curLine.attr('y2'));
		let llc = legLabelCoords([x, y], [x2, y2]);
		leg.select('text')
			.attr('x', llc[0])
			.attr('y', llc[1]);
	}

	// update leg references to new R tensor (first "bond" leg actually already referencing new R tensor)
	for (let i = 0; i < tdatumR.legIds.length; i++) {
		let leg = d3.select('#L' + tdatumR.legIds[i]);
		if (leg.empty()) { throw new Error('Leg with ID ' + tdatumR.legIds[i] + ' not found.'); }

		let ldatum = leg.datum();

		ldatum.tensorId = idR;
		ldatum.tensorOrd = i;
		leg.select('text')
			.text(function (d) { return d.tensorOrd; });

		const x = Number(tensorR.attr('x'));
		const y = Number(tensorR.attr('y'));
		let curLine = leg.select('line');
		curLine
			.attr('x1', x)
			.attr('y1', y);
		let x2 = Number(curLine.attr('x2'));
		let y2 = Number(curLine.attr('y2'));
		let llc = legLabelCoords([x, y], [x2, y2]);
		leg.select('text')
			.attr('x', llc[0])
			.attr('y', llc[1]);
	}

	// add QR decomposition operation
	ops.push(new QRDecompositionOp(tid, origLegIds.length, nleftdims, idQ, idR));

	// update generated code
	let code = generatePythonCode(ops);
	console.log('generated Python code:');
	console.log(code);

	genCode.html(code);
}
