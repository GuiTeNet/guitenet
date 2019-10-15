# GuiTeNet

GuiTeNet is a graphical user interface for (quantum) tensor networks. It is written in JavaScript and uses the [D3.js](https://d3js.org) library for visualization.


## Getting started

GuiTeNet runs directly in a web browser, online at [guitenet.github.io](https://guitenet.github.io). Follow the [tutorial](https://guitenet.github.io/tutorial.html) to get started.

To run GuiTeNet locally, clone the repository and open `index.html` in a web browser.


## Directory structure

```
.
|- index.html          container for loading JavaScript files, hosting the SVG canvas and code generation text element
|- scrips/
|    |- main.js        main file responsible for visualization and transforming user actions into intermediate elementary tensor network operations
|    |- operations.js  elementary tensor network operations
|    |- backend.js     code generation (currently Python/NumPy supported)
|    |- utils.js       utility functions
|- styles/
     |- guitenet.css   CSS file used for styling the SVG elements
```


## License

[MIT License](https://github.com/GuiTeNet/guitenet/blob/master/LICENSE)
