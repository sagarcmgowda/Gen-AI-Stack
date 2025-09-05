import React, { useMemo, useState } from 'react'
import ReactFlow, { Background, Controls, MiniMap, addEdge, useEdgesState, useNodesState } from 'reactflow'
import 'reactflow/dist/style.css'
import { useWorkflowStore } from '../store/useWorkflowStore'
import axios from 'axios'

const NodeCard = ({ data }) => {
  const palette = { user: 'bg-indigo-100', kb: 'bg-emerald-100', llm: 'bg-amber-100', out: 'bg-sky-100' }
  return (
    <div className={`rounded-2xl shadow px-3 py-2 text-sm ${palette[data.kind] || 'bg-white'}`}>
      <div className="font-semibold">{data.title}</div>
      <div className="text-xs opacity-70">{data.kind}</div>
    </div>
  )
}

const nodeTypes = { stackNode: NodeCard }

function ConfigPanel({ selectedId }) {
  const configs = useWorkflowStore(s => s.configs)
  const update = useWorkflowStore(s => s.updateConfig)
  if (!selectedId) return <div className="p-4 text-sm text-neutral-500">Select a node to configure</div>
  const cfg = configs[selectedId] || {}
  return (
    <div className="p-4 space-y-3">
      <div className="text-sm font-semibold">Configuration: {selectedId}</div>
      {selectedId === 'kb' && (
        <>
          <label className="block text-xs">Embedding Model</label>
          <select className="w-full border rounded p-2" value={cfg.embeddingModel || 'openai'} onChange={e=>update('kb',{embeddingModel:e.target.value})}>
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
          </select>
          <label className="block text-xs mt-2">Top K</label>
          <input type="number" className="w-full border rounded p-2" value={cfg.topK ?? 4} onChange={e=>update('kb',{topK:Number(e.target.value)})}/>
          <div className="mt-3">
            <label className="block text-xs mb-1">Upload PDF(s)</label>
            <input type="file" accept="application/pdf" multiple onChange={async (e)=>{
              const files = e.target.files
              const form = new FormData()
              for (const f of files) form.append('files', f)
              await axios.post('/api/upload', form)
              alert('Uploaded & indexed')
            }}/>
          </div>
        </>
      )}
      {selectedId === 'llm' && (
        <>
          <label className="block text-xs">Provider</label>
          <select className="w-full border rounded p-2" value={cfg.provider||'openai'} onChange={e=>update('llm',{provider:e.target.value})}>
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
          </select>
          <label className="block text-xs mt-2">Temperature</label>
          <input type="number" className="w-full border rounded p-2" step="0.1" min="0" max="2" value={cfg.temperature??0.7} onChange={e=>update('llm',{temperature:Number(e.target.value)})}/>
          <label className="block text-xs mt-2">Use Web Search</label>
          <input type="checkbox" className="ml-2" checked={!!cfg.useWeb} onChange={e=>update('llm',{useWeb:e.target.checked})}/>
          <label className="block text-xs mt-2">System Prompt</label>
          <textarea className="w-full border rounded p-2" rows="4" value={cfg.prompt||''} onChange={e=>update('llm',{prompt:e.target.value})}/>
          <div className="text-xs text-neutral-500">API keys are read by backend from environment.</div>
        </>
      )}
      {selectedId !== 'kb' && selectedId !== 'llm' && (
        <div className="text-xs text-neutral-500">No extra settings.</div>
      )}
    </div>
  )
}

export default function App(){
  const store = useWorkflowStore()
  const [nodes, setNodes, onNodesChange] = useNodesState(store.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(store.edges)
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [thinking, setThinking] = useState(false)
  const [input, setInput] = useState('')

  const onConnect = (params)=> setEdges((eds)=> addEdge({ ...params, animated:true }, eds))
  const onNodeClick = (e, node)=> store.setSelection(node.id)

  const validate = ()=>{
    const hasPath = edges.find(e=>e.source==='user' && e.target==='llm')
      && edges.find(e=>e.source==='llm' && e.target==='out')
    return !!hasPath
  }

  const buildStack = ()=>{
    if(!validate()) return alert('Invalid workflow. Ensure User → LLM → Output is connected.')
    alert('Stack built successfully ✅')
  }

  const sendMsg = async ()=>{
    if(!input.trim()) return
    const userText = input.trim()
    setMessages(m=>[...m, {role:'user', content:userText}])
    setInput('')
    setThinking(true)
    try{
      const payload = { workflow: store.serialize(), messages: [...messages, {role:'user', content:userText}] }
      const { data } = await axios.post('/api/run', payload)
      setMessages(m=>[...m, {role:'assistant', content:data.reply}])
    }catch(err){
      setMessages(m=>[...m, {role:'assistant', content:'Error from server.'}])
    }finally{
      setThinking(false)
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div className="text-lg font-semibold">GenAI Stack</div>
        <div className="space-x-2">
          <button className="px-3 py-2 rounded-xl border" onClick={buildStack}>Build Stack</button>
          <button className="px-3 py-2 rounded-xl bg-black text-white" onClick={()=>setChatOpen(true)}>Chat with Stack</button>
        </div>
      </header>
      <main className="flex-1 grid grid-cols-[300px_1fr_320px]">
        <aside className="border-r bg-white">
          <div className="p-4 font-semibold">Components</div>
          <div className="p-2 space-y-2 text-sm">
            <div className="p-3 border rounded-xl">User Query</div>
            <div className="p-3 border rounded-xl">Knowledge Base</div>
            <div className="p-3 border rounded-xl">LLM Engine</div>
            <div className="p-3 border rounded-xl">Output</div>
            <div className="text-xs text-neutral-500 pt-2">Tip: Nodes are pre-placed; connect them as per need.</div>
          </div>
        </aside>
        <section className="relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            fitView
          >
            <Background gap={18} size={1} />
            <MiniMap pannable zoomable />
            <Controls />
          </ReactFlow>
        </section>
        <aside className="border-l bg-white">
          <div className="p-4 font-semibold">Configuration</div>
          <ConfigPanel selectedId={useWorkflowStore.getState().selection}/>
        </aside>
      </main>

      {chatOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center" onClick={()=>setChatOpen(false)}>
          <div className="bg-white rounded-2xl w-[780px] max-w-[95vw] max-h-[85vh] flex flex-col" onClick={e=>e.stopPropagation()}>
            <div className="p-4 border-b font-semibold">GenAI Stack Chat</div>
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {messages.length===0 && <div className="text-sm text-neutral-500">Start a conversation to test your stack</div>}
              {messages.map((m,i)=>(
                <div key={i} className={m.role==='user'?'text-right':''}>
                  <div className={`inline-block px-3 py-2 rounded-2xl ${m.role==='user'?'bg-black text-white':'bg-neutral-100'}`}>{m.content}</div>
                </div>
              ))}
              {thinking && <div className="text-xs text-neutral-400">Thinking…</div>}
            </div>
            <div className="p-3 border-t flex gap-2">
              <input className="flex-1 border rounded-xl px-3 py-2" placeholder="Send a message" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()}/>
              <button className="px-4 py-2 rounded-xl bg-black text-white" onClick={sendMsg}>Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}