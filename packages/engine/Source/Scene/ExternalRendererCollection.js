import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";

/**
 * An ordered collection of {@link ExternalRenderer}s, called in order in each
 * frustum they overlap. The collection does not own the renderers: removing a
 * renderer, or destroying the scene, leaves whatever the renderer holds to its
 * owner.
 *
 * @alias ExternalRendererCollection
 * @constructor
 *
 * @see Scene#externalRenderers
 * @see ExternalRenderer
 */
function ExternalRendererCollection() {
  this._renderers = [];
}

Object.defineProperties(ExternalRendererCollection.prototype, {
  /**
   * Gets the number of renderers in the collection.
   *
   * @memberof ExternalRendererCollection.prototype
   * @type {number}
   * @readonly
   */
  length: {
    get: function () {
      return this._renderers.length;
    },
  },
});

/**
 * Adds a renderer to the collection.
 *
 * @param {ExternalRenderer} renderer The renderer to add. Any object with a <code>render</code> function, and optionally <code>show</code> and <code>boundingVolume</code>, may be added.
 * @param {number} [index] The index to add the renderer at. If omitted, the renderer is added after all the others, and is called last.
 * @returns {ExternalRenderer} The renderer added.
 *
 * @exception {DeveloperError} The renderer is already in the collection.
 * @exception {DeveloperError} index, if supplied, must be greater than or equal to zero and less than or equal to the number of renderers.
 *
 * @example
 * const renderer = scene.externalRenderers.add(new Cesium.ExternalRenderer({
 *   render: function (parameters) {
 *     // draw with parameters.gl
 *   },
 * }));
 */
ExternalRendererCollection.prototype.add = function (renderer, index) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("renderer", renderer);
  Check.typeOf.func("renderer.render", renderer.render);
  if (this.contains(renderer)) {
    throw new DeveloperError("renderer is already in this collection.");
  }
  //>>includeEnd('debug');

  const renderers = this._renderers;
  if (!defined(index)) {
    renderers.push(renderer);
  } else {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number.greaterThanOrEquals("index", index, 0);
    Check.typeOf.number.lessThanOrEquals("index", index, renderers.length);
    //>>includeEnd('debug');
    renderers.splice(index, 0, renderer);
  }
  return renderer;
};

/**
 * Removes a renderer from the collection.
 *
 * @param {ExternalRenderer} renderer The renderer to remove.
 * @returns {boolean} <code>true</code> if the renderer was removed; <code>false</code> if it was not in the collection.
 */
ExternalRendererCollection.prototype.remove = function (renderer) {
  const index = this._renderers.indexOf(renderer);
  if (index === -1) {
    return false;
  }
  this._renderers.splice(index, 1);
  return true;
};

/**
 * Removes every renderer from the collection.
 */
ExternalRendererCollection.prototype.removeAll = function () {
  this._renderers.length = 0;
};

/**
 * Determines if the collection contains a renderer.
 *
 * @param {ExternalRenderer} [renderer] The renderer to check for.
 * @returns {boolean} <code>true</code> if the collection contains the renderer; <code>false</code> otherwise.
 */
ExternalRendererCollection.prototype.contains = function (renderer) {
  return defined(renderer) && this._renderers.indexOf(renderer) !== -1;
};

/**
 * Gets the renderer at an index in the collection.
 *
 * @param {number} index The zero-based index of the renderer.
 * @returns {ExternalRenderer} The renderer at the index.
 */
ExternalRendererCollection.prototype.get = function (index) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("index", index);
  //>>includeEnd('debug');
  return this._renderers[index];
};

export default ExternalRendererCollection;
