'use client';
/* eslint-disable react-hooks/set-state-in-effect -- fetch the current user's notifications on mount. */
import { useCallback, useEffect, useState } from 'react';
type Notification = { id:string; type:string; title:string; message:string; href:string|null; readAt:string|null; createdAt:string };
export default function NotificationsPage(){
 const [items,setItems]=useState<Notification[]>([]),[message,setMessage]=useState('');
 const load=useCallback(async()=>{const r=await fetch('/api/reader/notifications');const d=await r.json();if(r.ok)setItems(d.notifications||[]);else setMessage(d.error||'Sign in to view notifications.');},[]);
 useEffect(()=>{void load();},[load]);
 const markRead=async(id:string)=>{const r=await fetch('/api/reader/notifications',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id})});if(r.ok)setItems(old=>old.map(n=>n.id===id?{...n,readAt:new Date().toISOString()}:n));};
 const markAll=async()=>{const r=await fetch('/api/reader/notifications',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({markAllRead:true})});if(r.ok)setItems(old=>old.map(n=>({...n,readAt:n.readAt||new Date().toISOString()})));};
 return <main style={{maxWidth:850,margin:'0 auto',padding:24}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><div><h1>Notifications</h1><p>Author replies, correction updates, and new edition announcements.</p></div><button onClick={()=>void markAll()} disabled={!items.some(n=>!n.readAt)}>Mark all read</button></div>{message&&<p role="status">{message}</p>}{items.length===0&&!message&&<p>You’re all caught up. Updates will appear here.</p>}{items.map(n=><article key={n.id} style={{padding:16,marginTop:12,border:'1px solid var(--border-subtle, #ddd)',borderRadius:12,opacity:n.readAt?0.75:1}}><div style={{display:'flex',gap:8,alignItems:'center'}}><strong>{n.title}</strong>{!n.readAt&&<span aria-label="Unread" style={{width:8,height:8,borderRadius:'50%',background:'#167d8d'}}/>}</div><p>{n.message}</p><small>{new Date(n.createdAt).toLocaleString()}</small><div style={{display:'flex',gap:12,marginTop:10}}>{n.href&&<a href={n.href}>Open update</a>}{!n.readAt&&<button onClick={()=>void markRead(n.id)}>Mark read</button>}</div></article>)}</main>;
}
