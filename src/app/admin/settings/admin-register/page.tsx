'use client'

import { useEffect, useState } from 'react'
import { getAdminList, registerAdmin, updateAdmin, deleteAdmin, AdminMember } from '@/services/admin'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { AdminFormModal } from '@/components/admin/AdminFormModal'
import { AdminDeleteConfirmModal } from '@/components/admin/AdminDeleteConfirmModal'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  UserCheck,
  UserX,
  Shield,
  Mail,
  Phone,
  Calendar
} from 'lucide-react'

export default function AdminRegisterPage() {
  const { toast } = useToast()
  const [admins, setAdmins] = useState<AdminMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false) // 비활성 관리자 표시 여부
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<AdminMember | null>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingAdmin, setDeletingAdmin] = useState<AdminMember | null>(null)

  useEffect(() => {
    loadAdminList()
  }, [])

  const loadAdminList = async () => {
    try {
      setLoading(true)
      const data = await getAdminList()
      setAdmins(data)
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message || '관리자 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    } finally {
      setLoading(false)
    }
  }

  // 검색 및 활성화 상태 필터링
  const filteredAdmins = admins.filter((admin) => {
    // 비활성 관리자 필터링 (기본적으로 비활성은 숨김)
    if (!showInactive && !admin.is_active) {
      return false
    }
    
    // 검색 필터링
    const search = searchTerm.toLowerCase()
    return (
      admin.memberShipId.toLowerCase().includes(search) ||
      admin.memberShipName.toLowerCase().includes(search) ||
      admin.memberShipEmail.toLowerCase().includes(search) ||
      (admin.memberShipPhone && admin.memberShipPhone.includes(search))
    )
  })

  // 레벨에 따른 배지 색상
  const getLevelColor = (level: number) => {
    if (level >= 9) return 'bg-red-100 text-red-800'
    if (level >= 7) return 'bg-orange-100 text-orange-800'
    if (level >= 5) return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
  }

  // 날짜 포맷팅
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 관리자 등록 모달 열기
  const handleOpenCreateModal = () => {
    setEditingAdmin(null)
    setModalMode('create')
    setModalOpen(true)
  }

  // 관리자 수정 모달 열기
  const handleOpenEditModal = (admin: AdminMember) => {
    setEditingAdmin(admin)
    setModalMode('edit')
    setModalOpen(true)
  }

  // 관리자 삭제 모달 열기
  const handleOpenDeleteModal = (admin: AdminMember) => {
    setDeletingAdmin(admin)
    setDeleteModalOpen(true)
  }

  // 관리자 삭제 처리
  const handleDeleteAdmin = async () => {
    if (!deletingAdmin) return

    try {
      await deleteAdmin(deletingAdmin.memberShipSid)
      toast({
        title: '삭제 완료',
        description: `관리자 "${deletingAdmin.memberShipName}" (${deletingAdmin.memberShipId})가 성공적으로 비활성화되었습니다.`,
        duration: 3000,
      })
      await loadAdminList()
    } catch (error: any) {
      toast({
        title: '삭제 실패',
        description: error.message || '관리자 삭제에 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
      throw error // 모달이 닫히지 않도록 에러를 다시 throw
    }
  }

  // 관리자 등록/수정 처리
  const handleSubmitAdmin = async (data: any) => {
    try {
      if (modalMode === 'create') {
        // 등록 모드
        if (!data.password || !data.password_confirm) {
          toast({
            title: '오류',
            description: '비밀번호를 입력해주세요.',
            variant: 'destructive',
            duration: 3000,
          })
          return
        }
        
        await registerAdmin({
          memberShipId: data.memberShipId,
          password: data.password,
          password_confirm: data.password_confirm,
          memberShipName: data.memberShipName,
          memberShipEmail: data.memberShipEmail,
          memberShipPhone: data.memberShipPhone || '',
          memberShipLevel: data.memberShipLevel || 1,
          is_admin: data.is_admin || false,
        })
        
        toast({
          title: '등록 완료',
          description: '관리자가 성공적으로 등록되었습니다.',
          duration: 3000,
        })
      } else {
        // 수정 모드
        if (!editingAdmin) {
          toast({
            title: '오류',
            description: '수정할 관리자 정보가 없습니다.',
            variant: 'destructive',
            duration: 3000,
          })
          return
        }
        
        await updateAdmin({
          memberShipSid: editingAdmin.memberShipSid,
          memberShipName: data.memberShipName,
          memberShipEmail: data.memberShipEmail,
          memberShipPhone: data.memberShipPhone || '',
          memberShipLevel: data.memberShipLevel || 1,
          is_admin: data.is_admin || false,
          is_active: data.is_active !== undefined ? data.is_active : editingAdmin.is_active, // 활성화 상태 업데이트
          ...(data.password && {
            password: data.password,
            password_confirm: data.password_confirm,
          }),
        })
        
        toast({
          title: '수정 완료',
          description: '관리자 정보가 성공적으로 수정되었습니다.',
          duration: 3000,
        })
      }
      
      // 모달 닫기 및 목록 새로고침
      setModalOpen(false)
      await loadAdminList()
    } catch (error: any) {
      toast({
        title: modalMode === 'create' ? '등록 실패' : '수정 실패',
        description: error.message || `${modalMode === 'create' ? '등록' : '수정'}에 실패했습니다.`,
        variant: 'destructive',
        duration: 3000,
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">관리자 등록</h1>
          <p className="text-gray-600 mt-1">관리자 목록을 조회하고 관리할 수 있습니다.</p>
        </div>
        <Button 
          className="bg-neon-yellow text-black hover:bg-opacity-90"
          onClick={handleOpenCreateModal}
        >
          <Plus className="h-4 w-4 mr-2" />
          관리자 등록
        </Button>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="관리자 ID, 이름, 이메일로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neon-yellow focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showInactive"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-neon-yellow focus:ring-neon-yellow"
            />
            <label htmlFor="showInactive" className="text-sm text-gray-700 cursor-pointer">
              비활성화된 관리자 표시
            </label>
          </div>
        </div>
      </div>

      {/* 관리자 목록 테이블 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-yellow mx-auto mb-4"></div>
            로딩 중...
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {searchTerm ? '검색 결과가 없습니다.' : '등록된 관리자가 없습니다.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    관리자 정보
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    연락처
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    권한
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    로그인 정보
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    등록일
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAdmins.map((admin) => (
                  <tr key={admin.memberShipSid} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {admin.memberShipName}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {admin.memberShipId}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            SID: {admin.memberShipSid}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        {admin.memberShipEmail}
                      </div>
                      {admin.memberShipPhone && (
                        <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                          <Phone className="h-4 w-4 text-gray-400" />
                          {admin.memberShipPhone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          {admin.is_admin ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neon-yellow text-black">
                              <Shield className="h-3 w-3 mr-1" />
                              관리자
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              일반
                            </span>
                          )}
                          {admin.is_active ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <UserCheck className="h-3 w-3 mr-1" />
                              활성
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <UserX className="h-3 w-3 mr-1" />
                              비활성
                            </span>
                          )}
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelColor(admin.memberShipLevel)}`}>
                          레벨 {admin.memberShipLevel}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {admin.last_login ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {formatDate(admin.last_login)}
                          </div>
                        ) : (
                          <span className="text-gray-400">로그인 이력 없음</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        로그인 {admin.login_count}회
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(admin.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleOpenEditModal(admin)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleOpenDeleteModal(admin)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 통계 정보 */}
        {!loading && filteredAdmins.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                총 {filteredAdmins.length}명의 관리자
                {searchTerm && ` (검색 결과: ${filteredAdmins.length}명)`}
              </span>
              <div className="flex items-center gap-4">
                <span>활성: {filteredAdmins.filter(a => a.is_active).length}명</span>
                <span>관리자: {filteredAdmins.filter(a => a.is_admin).length}명</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 관리자 등록/수정 모달 */}
      <AdminFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={handleSubmitAdmin}
        admin={editingAdmin}
        mode={modalMode}
      />

      {/* 관리자 삭제 확인 모달 */}
      <AdminDeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        admin={deletingAdmin}
        onConfirm={handleDeleteAdmin}
      />
    </div>
  )
}

