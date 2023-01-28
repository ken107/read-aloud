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
