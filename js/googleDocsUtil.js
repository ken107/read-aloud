var googleDocsUtil = function() {

    //- - - - - - - - - - - - - - - - - - - - 
    //General
    //- - - - - - - - - - - - - - - - - - - - 

    //Google Docs like to add \u200B and non breaking spaces to make sure the browser shows the text correct. 
    //When getting the text, we would prefer to get clean text. 
    function cleanDocumentText(text) {
        var cleanedText = text.replace(/\u200B/g, '');
        var nonBreakingSpaces = String.fromCharCode(160);
        var regex = new RegExp(nonBreakingSpaces, "g");
        cleanedText = cleanedText.replace(regex, ' ');
        return cleanedText;
    }

    function getValidCharactersRegex() {
        return '\\wæøåÆØÅéáÉÁöÖ';
    }

    function isWordBoundary(character) {
        return character.match('[' + getValidCharactersRegex() + ']') == null;
    }

    //- - - - - - - - - - - - - - - - - - - - 
    //Get Google Document
    //- - - - - - - - - - - - - - - - - - - - 

    //Finds all the text and the caret position in the google docs document.
    function getGoogleDocument() {

        var caret, caretRect;
        var caretIndex = 0;
        var caretLineIndex = 0;
        var caretLine = 0;
        var text = [];
        var nodes = [];
        var lineCount = 0;
        var globalIndex = 0;
        var selectedText = "";
        var paragraphrenderers = document.getElementsByClassName("kix-paragraphrenderer");

        if (containsUserCaretDom()) {
            caret = getUserCaretDom();
            caretRect = caret.getBoundingClientRect();
        }

        for (var i = 0; i < paragraphrenderers.length; i++) {
            var lineviews = paragraphrenderers[i].getElementsByClassName("kix-lineview");
            for (var j = 0; j < lineviews.length; j++) {
                var lineText = "";
                var selectionOverlays = lineviews[j].getElementsByClassName("kix-selection-overlay");
                var wordhtmlgeneratorWordNodes = lineviews[j].getElementsByClassName("kix-wordhtmlgenerator-word-node");
                for (var k = 0; k < wordhtmlgeneratorWordNodes.length; k++) {
                    var wordhtmlgeneratorWordNodeRect = wordhtmlgeneratorWordNodes[k].getBoundingClientRect();
                    wordhtmlgeneratorWordNodeRect.left
                    if (caretRect) {
                        if (doesRectsOverlap(wordhtmlgeneratorWordNodeRect, caretRect)) {
                            var caretXStart = caretRect.left - wordhtmlgeneratorWordNodeRect.left;
                            var localCaretIndex = getLocalCaretIndex(caretXStart, wordhtmlgeneratorWordNodes[k], lineviews[j]);
                            caretIndex = globalIndex + localCaretIndex;
                            caretLineIndex = lineText.length + localCaretIndex;
                            caretLine = lineCount;
                        }
                    }
                    var nodeText = cleanDocumentText(wordhtmlgeneratorWordNodes[k].innerText);
                    nodes.push({
                        index: globalIndex,
                        line: lineCount,
                        lineIndex: lineText.length,
                        node: wordhtmlgeneratorWordNodes[k],
                        lineElement: lineviews[j],
                        text: nodeText
                    });


                    for (var l = 0; l < selectionOverlays.length; l++) {
                        var selectionOverlay = selectionOverlays[l];
                        var selectionRect = selectionOverlay.getBoundingClientRect();
                        if (doesRectsOverlap(wordhtmlgeneratorWordNodeRect, selectionOverlay.getBoundingClientRect())) {
                            var selectionStartIndex = getLocalCaretIndex(selectionRect.left - wordhtmlgeneratorWordNodeRect.left, wordhtmlgeneratorWordNodes[k], lineviews[j]);
                            var selectionEndIndex = getLocalCaretIndex(selectionRect.left + selectionRect.width - wordhtmlgeneratorWordNodeRect.left, wordhtmlgeneratorWordNodes[k], lineviews[j]);
                            selectedText += nodeText.substring(selectionStartIndex, selectionEndIndex);
                        }
                    }

                    globalIndex += nodeText.length;
                    lineText += nodeText;
                }
                text.push(lineText);
                lineCount++;
            }
        }
        return {
            nodes: nodes,
            text: text,
            selectedText: selectedText,
            caret: {
                index: caretIndex,
                lineIndex: caretLineIndex,
                line: caretLine
            }
        };
    }

    function doesRangesOverlap(x1, x2, y1, y2) {
        return x1 <= y2 && y1 <= x2;
    }

    //http://stackoverflow.com/questions/306316/determine-if-two-rectangles-overlap-each-other
    function doesRectsOverlap(RectA, RectB) {
        return RectA.left <= RectB.right && RectA.right >= RectB.left &&
            RectA.top <= RectB.bottom && RectA.bottom >= RectB.top;
    }

    //The kix-cursor contain a kix-cursor-name dom, which is only set when it is not the users cursor
    function containsUserCaretDom() {
        var carets = document.getElementsByClassName("kix-cursor");
        for (var i = 0; i < carets.length; i++) {

            var nameDom = carets[i].getElementsByClassName("kix-cursor-name");
            var name = nameDom[0].innerText;
            if (!name) return true;
        }
        return false;
    }

    //The kix-cursor contain a kix-cursor-name dom, which is only set when it is not the users cursor
    function getUserCaretDom() {
        var carets = document.getElementsByClassName("kix-cursor");
        for (var i = 0; i < carets.length; i++) {
            var nameDom = carets[i].getElementsByClassName("kix-cursor-name");
            var name = nameDom[0].innerText;
            if (!name) return carets[i].getElementsByClassName("kix-cursor-caret")[0];
        }

        throw 'Could not find the users cursor';
    }


    //Gets the caret index on the innerText of the element. 
    //caretX: The x coordinate on where the element the caret is located
    //element: The element on which contains the text where in the caret position is
    //simulatedElement: Doing the calculation of the caret position, we need to create a temporary DOM, the DOM will be created as a child to the simulatedElement.
    function getLocalCaretIndex(caretX, element, simulateElement) {

        //Creates a span DOM for each letter
        var text = cleanDocumentText(element.innerText);
        var container = document.createElement("div");
        var letterSpans = [];
        for (var i = 0; i < text.length; i++) {
            var textNode = document.createElement("span");
            textNode.innerText = text[i];
            textNode.style.cssText = element.style.cssText;
            //"pre" = if there are multiple white spaces, they will all be rendered. Default behavior is for them to be collapesed
            textNode.style.whiteSpace = "pre";
            letterSpans.push(textNode);
            container.appendChild(textNode);
        }
        simulateElement.appendChild(container);

        //The caret is usually at the edge of the letter, we find the edge we are closest to. 
        var index = 0;
        var currentMinimumDistance = -1;
        var containerRect = container.getBoundingClientRect();
        for (var i = 0; i < letterSpans.length; i++) {
            var rect = letterSpans[i].getBoundingClientRect();
            var left = rect.left - containerRect.left;
            var right = left + rect.width;
            if (currentMinimumDistance == -1) {
                currentMinimumDistance = Math.abs(caretX - left);
            }
            var leftDistance = Math.abs(caretX - left);
            var rightDistance = Math.abs(caretX - right);

            if (leftDistance <= currentMinimumDistance) {
                index = i;
                currentMinimumDistance = leftDistance;
            }

            if (rightDistance <= currentMinimumDistance) {
                index = i + 1;
                currentMinimumDistance = rightDistance;
            }
        }

        //Clean up
        container.remove();
        return index;
    }

    //- - - - - - - - - - - - - - - - - - - - 
    //Google Document utils
    //- - - - - - - - - - - - - - - - - - - - 
    function findWordAtCaret(googleDocument) {

        var line = googleDocument.text[googleDocument.caret.line];
        if (line.length == 0) return {
            word: "",
            startIndex: googleDocument.caret.index,
            endIndex: googleDocument.caret.index
        };

        var startIndex = googleDocument.caret.lineIndex;
        var endIndex = googleDocument.caret.lineIndex;

        //We are at the end of the line
        if (googleDocument.caret.lineIndex >= line.length) {
            startIndex = line.length - 1;
            endIndex = line.length - 1;
        }

        //Finds the start of the word
        var character = line[startIndex];
        //If we are at the end of the word, the startIndex will result in a word boundary character.
        if (isWordBoundary(character) && startIndex > 0) {
            startIndex--;
            character = line[startIndex];
        }
        while (!isWordBoundary(character) && startIndex > 0) {
            startIndex--;
            character = line[startIndex];
        }

        //Finds the end of the word
        character = line[endIndex];
        while (!isWordBoundary(character) && endIndex < line.length - 1) {
            endIndex++;
            character = line[endIndex];
        }

        var globalStartIndex = googleDocument.caret.index - googleDocument.caret.lineIndex + startIndex;
        var globalEndIndex = googleDocument.caret.index - googleDocument.caret.lineIndex + endIndex;
        return {
            word: line.substring(startIndex, endIndex).trim(),
            startIndex: globalStartIndex,
            endIndex: globalEndIndex
        }
        //return line.substring(startIndex, endIndex).trim();
    }



    //- - - - - - - - - - - - - - - - - - - - 
    //Highlight
    //- - - - - - - - - - - - - - - - - - - - 
    function highlight(startIndex, endIndex, googleDocument) {

        for (var i = 0; i < googleDocument.nodes.length; i++) {

            //Highlight node if its index overlap with the provided index
            if (doesRangesOverlap(startIndex, endIndex, googleDocument.nodes[i].index, googleDocument.nodes[i].index + googleDocument.nodes[i].text.length)) {

                //Only draw highlight if there is text to highlight
                var textToHighlight = getTextInNode(startIndex, endIndex, googleDocument.nodes[i]);
                if (!textToHighlight.trim()) continue;

                var parentRect = googleDocument.nodes[i].lineElement.getBoundingClientRect();
                var nodeRect = googleDocument.nodes[i].node.getBoundingClientRect();
                var leftPosOffset = 0;
                var rightPosOffset = nodeRect.width;
                if (startIndex > googleDocument.nodes[i].index) {
                    var localIndex = startIndex - googleDocument.nodes[i].index;
                    leftPosOffset = getPositionOfIndex(localIndex, googleDocument.nodes[i].node, googleDocument.nodes[i].lineElement);
                }

                if (endIndex < googleDocument.nodes[i].index + googleDocument.nodes[i].text.length) {
                    var localIndex = endIndex - googleDocument.nodes[i].index;
                    rightPosOffset = getPositionOfIndex(endIndex - googleDocument.nodes[i].index, googleDocument.nodes[i].node, googleDocument.nodes[i].lineElement);
                }
                createHighlightNode(nodeRect.left - parentRect.left + leftPosOffset, nodeRect.top - parentRect.top, rightPosOffset - leftPosOffset, nodeRect.height, googleDocument.nodes[i].lineElement);
            }
        }
    }


    function getText(startIndex, endIndex, googleDocument) {

        var text = "";
        for (var i = 0; i < googleDocument.nodes.length; i++) {
            if (doesRangesOverlap(startIndex, endIndex, googleDocument.nodes[i].index, googleDocument.nodes[i].index + googleDocument.nodes[i].text.length)) {
                var textInNode = getTextInNode(startIndex, endIndex, googleDocument.nodes[i]);
                text += textInNode;
            }
        }

        return text;
    }


    function getTextInNode(startIndex, endIndex, node) {
        var start = 0;
        var end = node.text.length;
        if (startIndex > node.index) {
            start = startIndex - node.index;
        }
        if (endIndex < node.index + node.text.length) {
            end = endIndex - node.index;
        }
        return node.text.substring(start, end);

    }

    function createHighlightNode(left, top, width, height, parentElement) {

        var highlightNode = document.createElement("div");
        highlightNode.setAttribute("class", "dictus_highlight_node");
        highlightNode.style.position = 'absolute';
        highlightNode.style.left = left + "px";
        highlightNode.style.top = top + "px";
        highlightNode.style.width = width + "px";
        highlightNode.style.height = height + "px";
        highlightNode.style.backgroundColor = "#D1E3FF";
        highlightNode.style.color = "#D1E3FF";
        //Fuzzy edges on the highlight
        highlightNode.style.boxShadow = "0px 0px 1px 1px #D1E3FF";

        parentElement.appendChild(highlightNode);

    }

    function removeHighlightNodes() {
        var highlightNodes = document.getElementsByClassName("dictus_highlight_node");
        while (highlightNodes.length > 0) highlightNodes[0].remove();
    }

    //Index: The index on the local element 
    function getPositionOfIndex(index, element, simulateElement) {

        //If index is 0 it is always the left most position of the element
        if (index == 0) {
            return 0;
        }

        //Creates a span DOM for each letter
        var text = cleanDocumentText(element.innerText);
        var container = document.createElement("div");
        var letterSpans = [];
        for (var i = 0; i < index; i++) {
            var textNode = document.createElement("span");
            textNode.innerText = text[i];
            textNode.style.cssText = element.style.cssText;
            //"pre" = if there are multiple white spaces, they will all be rendered. Default behavior is for them to be collapesed
            textNode.style.whiteSpace = "pre";
            letterSpans.push(textNode);
            container.appendChild(textNode);
        }
        simulateElement.appendChild(container);

        var containerRect = container.getBoundingClientRect();
        var rect = letterSpans[index - 1].getBoundingClientRect();
        var leftPosition = rect.left + rect.width - containerRect.left;

        //Clean up
        container.remove();
        return leftPosition;
    }

    return {
        getGoogleDocument: function() {
            return getGoogleDocument();
        },
        findWordAtCaret: function(googleDocument) {
            return findWordAtCaret(googleDocument);
        },
        getText: function(startIndex, endIndex, googleDocument) {
            return getText(startIndex, endIndex, googleDocument);
        },
        highlight: function(startIndex, endIndex, googleDocument) {
            highlight(startIndex, endIndex, googleDocument);
        },
        removeHighlight: function() {
            removeHighlightNodes();
        },
        cleanDocumentText: function(text) {
            return cleanDocumentText(text);
        }
    }
}();