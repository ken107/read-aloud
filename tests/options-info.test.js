const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
test('info popup stays open through Firefox panel resizing and closes with Escape/outside click',()=>{
  function target() {
    const events={};
    return {events,hidden:true,style:{},attributes:{},
      addEventListener:(name,fn)=>events[name]=fn,
      setAttribute(name,value){this.attributes[name]=value},
      contains(node){return node===this},
      getClientRects:()=>[{}],getBoundingClientRect:()=>({right:500,bottom:100,height:70}),
      focus(){this.focused=true}};
  }
  const button=target(),popup=target(),anchor=target(),voices=target();
  const document=target(),window=Object.assign(target(),{innerWidth:530,innerHeight:300});
  document.getElementById=id=>({button,popup,anchor,voices}[id]);
  const source=fs.readFileSync(require.resolve('../js/options.js'),'utf8');
  const ctx=vm.createContext({document,window,brapi:{i18n:{getMessage:()=> 'Information'}}});
  vm.runInContext(source.slice(source.indexOf('function initSettingInfoPopup')),ctx);
  ctx.initSettingInfoPopup('button','popup','anchor','label');
  button.events.click(); assert.equal(popup.hidden,false);
  window.innerHeight=150;window.events.resize();
  assert.equal(popup.hidden,false);assert.equal(button.attributes['aria-expanded'],'true');assert.equal(popup.style.top,'64px');
  document.events.keydown({key:'Escape',preventDefault(){}});
  assert.equal(popup.hidden,true);assert.equal(button.focused,true);
  button.events.click();document.events.click({target:{}});assert.equal(popup.hidden,true);
});
