/*
interface MessagingPeer {
  send(msg)
  disconnect()
  EVENT onReceive(msg)
  EVENT onDisconnect()
}
*/
function ExtensionMessagingPeer(port) {
  var self = this;
  this.send = function(msg) {
    port.postMessage(msg);
  }
  this.disconnect = function() {
    port.disconnect();
  }
  port.onMessage.addListener(function(msg) {
    self.onReceive(msg);
  })
  port.onDisconnect.addListener(function() {
    if (self.onDisconnect) self.onDisconnect();
  })
}

function DocumentMessagingPeer(sendPrefix, receivePrefix) {
  var self = this;
  this.send = function(msg) {
    document.dispatchEvent(new CustomEvent(sendPrefix+"Message", {detail: JSON.stringify(msg)}));
  }
  this.disconnect = function() {
    document.dispatchEvent(new CustomEvent(sendPrefix+"Disconnect"));
  }
  document.addEventListener(receivePrefix+"Message", function(event) {
    self.onReceive(JSON.parse(event.detail));
  })
  document.addEventListener(receivePrefix+"Disconnect", function() {
    if (self.onDisconnect) self.onDisconnect();
  })
}

/*
interface RpcPeer {
  invoke(method, args)
  disconnect()
  EVENT onInvoke(method, args)
  EVENT onDisconnect
}
*/
function RpcPeer(messagingPeer) {
  var self = this;
  var pending = {idGen: 0};
  this.invoke = function() {
    var id = ++pending.idGen;
    try {
      messagingPeer.send({type: "request", id: id, args: Array.prototype.slice.call(arguments)});
      return new Promise(function(fulfill, reject) {
        pending[id] = {fulfill: fulfill, reject: reject};
      })
    }
    catch (err) {
      return Promise.reject(err);
    }
  }
  this.disconnect = function() {
    messagingPeer.disconnect();
  }
  messagingPeer.onReceive = function(msg) {
    if (msg.type == "request") {
      Promise.resolve()
        .then(function() {
          return self.onInvoke.apply(self, msg.args);
        })
        .then(function(result) {
          messagingPeer.send({type: "response", id: msg.id, result: result});
        },
        function(err) {
          messagingPeer.send({type: "response", id: msg.id, error: err.message});
        })
    }
    else if (msg.type == "response") {
      if (pending[msg.id]) {
        if (msg.error) pending[msg.id].reject(new Error(msg.error));
        else pending[msg.id].fulfill(msg.result);
        delete pending[msg.id];
      }
      else console.error("Unexpected response.id", msg);
    }
    else console.error("Unexpected message.type", msg);
  }
  messagingPeer.onDisconnect = function() {
    if (self.onDisconnect) self.onDisconnect();
  }
}

function registerMessageListener(name, handlers) {
  brapi.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if (request.dest == name) {
        handle(request)
          .then(sendResponse, err => sendResponse({error: errorToJson(err)}))
        return true
      }
    }
  )
  async function handle(request) {
    const handler = handlers[request.method]
    if (!handler) throw new Error("Bad method " + request.method)
    return handler.apply(null, request.args)
  }
}

function errorToJson(err) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    }
  }
  else {
    return err
  }
}



function makeDispatcher(myAddress, handlers) {
    const pendingRequests = new Map();
    return {
        waitForResponse(requestId) {
            let pending = pendingRequests.get(requestId);
            if (!pending)
                pendingRequests.set(requestId, pending = makePending());
            return pending.promise;
        },
        dispatch(message, sender, sendResponse) {
            switch (message.type) {
                case "request": return handleRequest(message, sender, sendResponse);
                case "notification": return handleNotification(message, sender);
                case "response": return handleResponse(message);
            }
        },
        updateHandlers(newHandlers) {
            handlers = newHandlers;
        }
    };
    function makePending() {
        const pending = {};
        pending.promise = new Promise((fulfill, reject) => {
            pending.fulfill = fulfill;
            pending.reject = reject;
        });
        return pending;
    }
    function handleRequest(req, sender, sendResponse) {
        if (req.to == myAddress) {
            if (handlers[req.method]) {
                Promise.resolve()
                    .then(() => handlers[req.method](req.args, sender))
                    .then(result => sendResponse({ to: req.from, type: "response", id: req.id, result, error: undefined }), error => sendResponse({ to: req.from, type: "response", id: req.id, result: undefined, error }));
                //let caller know that sendResponse will be called asynchronously
                return true;
            }
            else {
                console.error("No handler for method", req);
            }
        }
    }
    function handleNotification(ntf, sender) {
        if (ntf.to == myAddress) {
            if (handlers[ntf.method]) {
                Promise.resolve()
                    .then(() => handlers[ntf.method](ntf.args, sender))
                    .catch(error => console.error("Failed to handle notification", ntf, error));
            }
            else {
                console.error("No handler for method", ntf);
            }
        }
    }
    function handleResponse(res) {
        const pending = pendingRequests.get(res.id);
        if (pending) {
            pendingRequests.delete(res.id);
            if (res.error)
                pending.reject(res.error);
            else
                pending.fulfill(res.result);
        }
        else if (res.to == myAddress) {
            console.error("Stray response", res);
        }
    }
}
