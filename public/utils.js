/**
 *
 * @param {String} type The tag type
 * @param {Object} attrs The props of the object
 * @param {HTMLElement|String} children Children of the new element
 * @returns {HTMLElement}
 */
function elt(type, attrs = {}, ...children) {
  let dom = document.createElement(type);

  for (let attr of Object.keys(attrs)) {
    dom.setAttribute(attr, attrs[attr]);
  }

  for (let child of children) {
    if (typeof child != "string") {
      dom.appendChild(child);
    } else {
      dom.appendChild(document.createTextNode(child));
    }
  }
  return dom;
}
