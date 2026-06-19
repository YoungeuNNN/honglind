import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { useToastStore } from '@/stores/toastStore'
import * as DS from '@/api/dataService'
import { CATEGORIES, CATEGORY_LABELS, MARKET_TYPES } from '@/utils/constants'
import { BackIcon } from '@/components/ui/Icons'
import type { Attachment, MarketType } from '@/types'

export function WritePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const openVerifyPrompt = useUIStore(s => s.openVerifyPrompt)
  const toast = useToastStore(s => s.show)
  const isEdit = !!id
  const existingPost = isEdit ? DS.getPostById(id!) : null
  const canWrite = !!user && (user.verificationStatus === 'verified' || user.role === 'admin')

  // 미인증 사용자가 /write 로 직접 접근하면 안내 후 홈으로
  useEffect(() => {
    if (user && !canWrite) { openVerifyPrompt(); navigate('/', { replace: true }) }
  }, [user, canWrite, openVerifyPrompt, navigate])

  const [category, setCategory] = useState(existingPost?.category || CATEGORIES[0])
  const [title, setTitle] = useState(existingPost?.title || '')
  const [content, setContent] = useState(existingPost?.content || '')
  const [cbPos, setCbPos] = useState(existingPost?.cheongbing?.position || '')
  const [cbDenom, setCbDenom] = useState(existingPost?.cheongbing?.denomination || '')
  const [cbRegion, setCbRegion] = useState(existingPost?.cheongbing?.region || '')
  const [cbSize, setCbSize] = useState(existingPost?.cheongbing?.churchSize || '')
  const [cbSalary, setCbSalary] = useState(existingPost?.cheongbing?.salary || '')
  const [cbDeadline, setCbDeadline] = useState(existingPost?.cheongbing?.deadline || '')
  const [cbContact, setCbContact] = useState(existingPost?.cheongbing?.contact || '')
  const [sermonVerse, setSermonVerse] = useState(existingPost?.sermonVerse || '')
  const [pollEnabled, setPollEnabled] = useState(!!existingPost?.poll)
  const [pollOptions, setPollOptions] = useState<string[]>(existingPost?.poll?.options.map(o => o.text) || ['', ''])
  // 사역장터 거래 정보 + 첨부
  const [mType, setMType] = useState<MarketType>(existingPost?.market?.type || '판매')
  const [mPrice, setMPrice] = useState(existingPost?.market?.price || '')
  const [mContact, setMContact] = useState(existingPost?.market?.contact || '')
  const [attachments, setAttachments] = useState<Attachment[]>(existingPost?.attachments || [])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (isEdit && !existingPost) navigate('/') }, [isEdit, existingPost, navigate])

  const handleSubmit = async () => {
    if (!user) return
    if (!title.trim()) { toast('제목을 입력하세요.'); return }
    if (!content.trim()) { toast('내용을 입력하세요.'); return }
    if (category === '사역장터' && !mContact.trim()) { toast('연락 방법을 입력하세요.'); return }
    let poll = null
    if (pollEnabled) {
      const opts = pollOptions.filter(t => t.trim())
      if (opts.length < 2) { toast('투표 선택지를 2개 이상 입력하세요.'); return }
      poll = { options: opts.map(text => ({ text: text.trim(), votes: [] as string[] })) }
    }
    setSubmitting(true)
    try {
      // 사역장터: 새 첨부 파일 업로드 후 기존 첨부와 합치기
      let finalAttachments: Attachment[] = []
      if (category === '사역장터') {
        const uploaded: Attachment[] = []
        for (const f of newFiles) {
          const path = await DS.uploadMarketFile(user.id, f)
          uploaded.push({ path, name: f.name, kind: f.type.startsWith('image/') ? 'image' : 'file' })
        }
        finalAttachments = [...attachments, ...uploaded]
      }
      const data = {
        authorId: user.id, category, title: title.trim(), content: content.trim(),
        cheongbing: category === '청빙' ? { position: cbPos, denomination: cbDenom, region: cbRegion, churchSize: cbSize, salary: cbSalary, deadline: cbDeadline, contact: cbContact } : null,
        market: category === '사역장터'
          ? { type: mType, price: mPrice.trim(), status: (existingPost?.market?.status || 'available'), contact: mContact.trim() }
          : null,
        attachments: finalAttachments,
        prayers: category === '기도요청' ? [] as string[] : null,
        sermonVerse: category === '설교준비' ? (sermonVerse.trim() || null) : null,
        poll,
      }
      if (isEdit) {
        await DS.updatePost(id!, data); toast('게시글이 수정되었습니다.'); navigate(`/post/${id}`)
      } else {
        const post = await DS.createPost(data); toast('게시글이 등록되었습니다!'); navigate(`/post/${post.id}`)
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const backTarget = isEdit ? `/post/${id}` : '/'

  return (
    <>
      <div className="back-btn" onClick={() => navigate(backTarget)}><BackIcon /> {isEdit ? '돌아가기' : '목록으로'}</div>
      <div className="write-page fade-in">
        <h2>{isEdit ? '글 수정' : '새 글 작성'}</h2>
        <div className="form-group"><label>카테고리</label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
          </select>
        </div>
        {category === '청빙' && (
          <div className="cheongbing-fields">
            <h4>&#128227; 청빙 상세 정보</h4>
            <div className="cheongbing-row">
              <div className="form-group"><label style={{fontSize:12}}>직분</label><input type="text" value={cbPos} onChange={e=>setCbPos(e.target.value)} placeholder="예: 청년부 전도사"/></div>
              <div className="form-group"><label style={{fontSize:12}}>교단</label><input type="text" value={cbDenom} onChange={e=>setCbDenom(e.target.value)} placeholder="예: 대한예수교장로회(합동)"/></div>
            </div>
            <div className="cheongbing-row">
              <div className="form-group"><label style={{fontSize:12}}>지역</label><input type="text" value={cbRegion} onChange={e=>setCbRegion(e.target.value)} placeholder="예: 서울 강남구"/></div>
              <div className="form-group"><label style={{fontSize:12}}>교회 규모</label><input type="text" value={cbSize} onChange={e=>setCbSize(e.target.value)} placeholder="예: 출석 300명"/></div>
            </div>
            <div className="cheongbing-row">
              <div className="form-group"><label style={{fontSize:12}}>사례비</label><input type="text" value={cbSalary} onChange={e=>setCbSalary(e.target.value)} placeholder="예: 월 250만원 + 사택"/></div>
              <div className="form-group"><label style={{fontSize:12}}>마감일</label><input type="date" value={cbDeadline} onChange={e=>setCbDeadline(e.target.value)}/></div>
            </div>
            <div className="form-group"><label style={{fontSize:12}}>연락처</label><input type="text" value={cbContact} onChange={e=>setCbContact(e.target.value)} placeholder="이메일 또는 전화번호" style={{width:'100%',padding:'8px 12px',border:'1px solid #C8E6C9',borderRadius:8,fontSize:13}}/></div>
          </div>
        )}
        {category === '설교준비' && (
          <div className="cheongbing-fields" style={{background:'#F5F0FF',borderColor:'#D1C4E9'}}>
            <h4 style={{color:'#4A148C'}}>&#9971; 설교 준비</h4>
            <div className="form-group"><label style={{fontSize:12}}>본문 성경 구절</label>
              <input type="text" value={sermonVerse} onChange={e=>setSermonVerse(e.target.value)} placeholder="예: 요한복음 3:16" style={{width:'100%',padding:'8px 12px',border:'1px solid #D1C4E9',borderRadius:8,fontSize:13}}/></div>
          </div>
        )}
        {category === '사역장터' && (
          <div className="cheongbing-fields" style={{background:'#FFF8E1',borderColor:'#FFE0B2'}}>
            <h4 style={{color:'#E65100'}}>&#128722; 거래 정보</h4>
            <div className="cheongbing-row">
              <div className="form-group"><label style={{fontSize:12}}>거래 유형</label>
                <select value={mType} onChange={e=>setMType(e.target.value as MarketType)} style={{width:'100%',padding:'8px 12px',border:'1px solid #FFE0B2',borderRadius:8,fontSize:13}}>
                  {MARKET_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group"><label style={{fontSize:12}}>가격</label>
                <input type="text" value={mPrice} onChange={e=>setMPrice(e.target.value)} placeholder="예: 10,000원 / 무료 / 협의" style={{width:'100%',padding:'8px 12px',border:'1px solid #FFE0B2',borderRadius:8,fontSize:13}}/></div>
            </div>
            <div className="form-group"><label style={{fontSize:12}}>연락 방법</label>
              <input type="text" value={mContact} onChange={e=>setMContact(e.target.value)} placeholder="예: 앱 내 쪽지 / 이메일 / 오픈채팅 링크" style={{width:'100%',padding:'8px 12px',border:'1px solid #FFE0B2',borderRadius:8,fontSize:13}}/></div>
            <div className="form-group"><label style={{fontSize:12}}>자료 / 미리보기 첨부</label>
              <input type="file" multiple accept="image/*,.pdf,.hwp,.hwpx,.ppt,.pptx,.doc,.docx,.zip"
                onChange={e=>{ setNewFiles(prev=>[...prev, ...Array.from(e.target.files||[])]); e.target.value='' }}
                style={{fontSize:13}}/>
              <div style={{fontSize:11,color:'var(--subtext)',marginTop:4}}>이미지는 미리보기로, 그 외 파일은 다운로드 링크로 표시됩니다.</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:8}}>
                {attachments.map((a,i)=>(
                  <span key={a.path} className="cheongbing-tag">{a.name}
                    <button type="button" onClick={()=>setAttachments(attachments.filter((_,j)=>j!==i))} style={{marginLeft:6,border:'none',background:'none',color:'var(--danger)',cursor:'pointer'}}>&times;</button>
                  </span>
                ))}
                {newFiles.map((f,i)=>(
                  <span key={`new-${i}`} className="cheongbing-tag" style={{borderStyle:'dashed'}}>{f.name}
                    <button type="button" onClick={()=>setNewFiles(newFiles.filter((_,j)=>j!==i))} style={{marginLeft:6,border:'none',background:'none',color:'var(--danger)',cursor:'pointer'}}>&times;</button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="form-group"><label>제목</label><input type="text" value={title} onChange={e=>setTitle(e.target.value)} placeholder="제목을 입력하세요" maxLength={100}/></div>
        <div className="form-group"><label>내용</label><textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="자유롭게 작성하세요. 익명이 보장됩니다."/></div>
        <div className="form-group">
          <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
            <input type="checkbox" checked={pollEnabled} onChange={e=>setPollEnabled(e.target.checked)} style={{width:16,height:16,accentColor:'var(--primary)'}}/>투표 추가
          </label>
        </div>
        {pollEnabled && (
          <div style={{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'var(--radius-md)',padding:16,marginBottom:20}}>
            {pollOptions.map((opt,i)=>(
              <div key={i} className="form-row" style={{marginBottom:8,alignItems:'center'}}>
                <input type="text" className="form-input" placeholder={`선택지 ${i+1}`} value={opt}
                  onChange={e=>{const next=[...pollOptions];next[i]=e.target.value;setPollOptions(next)}} style={{fontSize:13,padding:'8px 12px'}}/>
                {i>=2 && <button className="btn btn-text btn-small" onClick={()=>setPollOptions(pollOptions.filter((_,j)=>j!==i))} style={{color:'var(--danger)'}}>&times;</button>}
              </div>
            ))}
            {pollOptions.length<5 && <button className="btn btn-secondary btn-small" onClick={()=>setPollOptions([...pollOptions,''])} style={{marginTop:4}}>+ 선택지 추가</button>}
          </div>
        )}
        <div className="write-actions">
          <button className="btn btn-secondary" onClick={()=>navigate(backTarget)}>취소</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting?'저장 중...':(isEdit?'수정하기':'등록하기')}</button>
        </div>
      </div>
    </>
  )
}
