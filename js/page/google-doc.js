var excludeProperties = new Set([
    "version",
    "title",
    "lang",
    "translate",
    "dir",
    "dataset",
    "hidden",
    "tabIndex",
    "accessKey",
    "draggable",
    "spellcheck",
    "contentEditable",
    "isContentEditable",
    "offsetParent",
    "offsetTop",
    "offsetLeft",
    "offsetWidth",
    "offsetHeight",
    "style",
    "innerText",
    "outerText",
    "onabort",
    "onblur",
    "oncancel",
    "oncanplay",
    "oncanplaythrough",
    "onchange",
    "onclick",
    "onclose",
    "oncontextmenu",
    "oncuechange",
    "ondblclick",
    "ondrag",
    "ondragend",
    "ondragenter",
    "ondragleave",
    "ondragover",
    "ondragstart",
    "ondrop",
    "ondurationchange",
    "onemptied",
    "onended",
    "onerror",
    "onfocus",
    "oninput",
    "oninvalid",
    "onkeydown",
    "onkeypress",
    "onkeyup",
    "onload",
    "onloadeddata",
    "onloadedmetadata",
    "onloadstart",
    "onmousedown",
    "onmouseenter",
    "onmouseleave",
    "onmousemove",
    "onmouseout",
    "onmouseover",
    "onmouseup",
    "onmousewheel",
    "onpause",
    "onplay",
    "onplaying",
    "onprogress",
    "onratechange",
    "onreset",
    "onresize",
    "onscroll",
    "onseeked",
    "onseeking",
    "onselect",
    "onstalled",
    "onsubmit",
    "onsuspend",
    "ontimeupdate",
    "ontoggle",
    "onvolumechange",
    "onwaiting",
    "onwheel",
    "ongotpointercapture",
    "onlostpointercapture",
    "onpointerdown",
    "onpointermove",
    "onpointerup",
    "onpointercancel",
    "onpointerover",
    "onpointerout",
    "onpointerenter",
    "onpointerleave",
    "click",
    "focus",
    "blur",
    "onauxclick",
    "nonce",
    "namespaceURI",
    "prefix",
    "localName",
    "tagName",
    "id",
    "className",
    "classList",
    "slot",
    "attributes",
    "shadowRoot",
    "assignedSlot",
    "innerHTML",
    "outerHTML",
    "scrollTop",
    "scrollLeft",
    "scrollWidth",
    "scrollHeight",
    "clientTop",
    "clientLeft",
    "clientWidth",
    "clientHeight",
    "onbeforecopy",
    "onbeforecut",
    "onbeforepaste",
    "oncopy",
    "oncut",
    "onpaste",
    "onsearch",
    "onselectstart",
    "previousElementSibling",
    "nextElementSibling",
    "children",
    "firstElementChild",
    "lastElementChild",
    "childElementCount",
    "onwebkitfullscreenchange",
    "onwebkitfullscreenerror",
    "setPointerCapture",
    "releasePointerCapture",
    "hasPointerCapture",
    "hasAttributes",
    "getAttributeNames",
    "getAttribute",
    "getAttributeNS",
    "setAttribute",
    "setAttributeNS",
    "removeAttribute",
    "removeAttributeNS",
    "hasAttribute",
    "hasAttributeNS",
    "getAttributeNode",
    "getAttributeNodeNS",
    "setAttributeNode",
    "setAttributeNodeNS",
    "removeAttributeNode",
    "closest",
    "matches",
    "webkitMatchesSelector",
    "attachShadow",
    "getElementsByTagName",
    "getElementsByTagNameNS",
    "getElementsByClassName",
    "insertAdjacentElement",
    "insertAdjacentText",
    "insertAdjacentHTML",
    "requestPointerLock",
    "getClientRects",
    "getBoundingClientRect",
    "scrollIntoView",
    "scrollIntoViewIfNeeded",
    "createShadowRoot",
    "getDestinationInsertionPoints",
    "animate",
    "remove",
    "querySelector",
    "querySelectorAll",
    "webkitRequestFullScreen",
    "webkitRequestFullscreen",
    "scroll",
    "scrollTo",
    "scrollBy",
    "before",
    "after",
    "replaceWith",
    "prepend",
    "append",
    "ELEMENT_NODE",
    "ATTRIBUTE_NODE",
    "TEXT_NODE",
    "CDATA_SECTION_NODE",
    "ENTITY_REFERENCE_NODE",
    "ENTITY_NODE",
    "PROCESSING_INSTRUCTION_NODE",
    "COMMENT_NODE",
    "DOCUMENT_NODE",
    "DOCUMENT_TYPE_NODE",
    "DOCUMENT_FRAGMENT_NODE",
    "NOTATION_NODE",
    "DOCUMENT_POSITION_DISCONNECTED",
    "DOCUMENT_POSITION_PRECEDING",
    "DOCUMENT_POSITION_FOLLOWING",
    "DOCUMENT_POSITION_CONTAINS",
    "DOCUMENT_POSITION_CONTAINED_BY",
    "DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC",
    "nodeType",
    "nodeName",
    "baseURI",
    "isConnected",
    "ownerDocument",
    "parentNode",
    "parentElement",
    "childNodes",
    "firstChild",
    "lastChild",
    "previousSibling",
    "nextSibling",
    "nodeValue",
    "textContent",
    "hasChildNodes",
    "getRootNode",
    "normalize",
    "cloneNode",
    "isEqualNode",
    "isSameNode",
    "compareDocumentPosition",
    "contains",
    "lookupPrefix",
    "lookupNamespaceURI",
    "isDefaultNamespace",
    "insertBefore",
    "appendChild",
    "replaceChild",
    "removeChild",
    "addEventListener",
    "removeEventListener",
    "dispatchEvent",
])

function extractText(target, test, maxDepth) {
    var visited = new Set()
    var results = []
    var iterations = 0
    var walk = function(propertyName, value, path, depth) {
        iterations++
        if ("prototype" === propertyName || value instanceof Window) return
        if (depth > maxDepth) return
        var childPath = path.concat(propertyName)
        try {
            if (test(propertyName, value)) {
                results.push({ path: childPath, value: value })
                return
            }
        } catch (err) {}
        if (null != value && !visited.has(value)) {
            visited.add(value)
            if (Array.isArray(value)) {
                value.forEach(function(item, index) {
                    try {
                        walk(index.toString(), item, childPath, depth + 1)
                    } catch (e) {}
                })
            }
            else if (value instanceof Object) {
                var names = 1 === value.nodeType && "string" == typeof value.nodeName
                    ? Object.getOwnPropertyNames(target).filter(function(name) {return !excludeProperties.has(name)})
                    : Object.getOwnPropertyNames(value)
                names.forEach(function(name) {
                    try {
                        walk(name, value[name], childPath, depth + 1)
                    } catch (e) {}
                })
            }
        }
    }
    Object.getOwnPropertyNames(target).forEach(function(name) {
        try {
            walk(name, target[name], [], 0)
        } catch (e) {}
    })
    return {
        results: results,
        iterations: iterations
    }
}

(function() {
    try {
        var res = extractText(window.KX_kixApp, function(propertyName, value) {
            return typeof value == "string" && "\x03" === value.charAt(0)
        }, 5)
        var text = res.results.map(function(item) {
            return item.value
        }).reduce(function(largest, text) {
            return text.length > largest.length ? text : largest
        })
        if (!text) throw new Error("No text found")
        text = text.slice(1)
        console.debug("Extracted %d char after %d iterations", text.length, res.iterations)
        window.postMessage({type: "ReadAloudText", text: text}, "*")
    }
    catch(err) {
        console.error(err)
        window.postMessage({type: "ReadAloudText", error: err.message}, "*")
    }
})()
