'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { 
  RadioGroup,
  RadioGroupItem
} from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { TreeView, type TreeDataItem } from '@/components/ui/tree-view';
import { Search, Plus, Edit, Trash2, RotateCcw, Folder } from 'lucide-react';
import apiClient from '@/lib/axios';
import { formatDateTime } from '@/lib/utils';

// 백엔드 API와 호환되는 시스템 코드 인터페이스
interface SystemCode {
  sid?: number;  // ViewSet에서 사용하는 내부 ID
  parentsSid?: number;  // ViewSet에서 사용하는 부모 ID
  sysCodeSid: string;
  sysCodeParentsSid: string;
  sysCodeName: string;
  sysCodeValName: string | null;
  sysCodeVal: string | null;
  sysCodeVal1Name: string | null;
  sysCodeVal1: string | null;
  sysCodeVal2Name: string | null;
  sysCodeVal2: string | null;
  sysCodeVal3Name: string | null;
  sysCodeVal3: string | null;
  sysCodeVal4Name: string | null;
  sysCodeVal4: string | null;
  sysCodeUse: string;
  sysCodeSort: number | null;
  sysCodeRegUserName: string | null;
  sysCodeRegDateTime: string | null;
  children?: SystemCode[];
}

// 코드 카테고리 인터페이스 (TreeView와 호환)
interface CodeCategory extends TreeDataItem {
  id: string;
  name: string;
  children?: CodeCategory[];
  isLeaf?: boolean;
}

export default function SystemCodePage() {
  const [mounted, setMounted] = useState(false);
  const [selectedCode, setSelectedCode] = useState<SystemCode | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<SystemCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 코드 입력 폼 상태
  const [codeForm, setCodeForm] = useState({
    sysCodeSid: '',
    sysCodeParentsSid: '',
    sysCodeName: '',
    sysCodeValName: '',
    sysCodeVal: '',
    sysCodeVal1Name: '',
    sysCodeVal1: '',
    sysCodeVal2Name: '',
    sysCodeVal2: '',
    sysCodeVal3Name: '',
    sysCodeVal3: '',
    sysCodeVal4Name: '',
    sysCodeVal4: '',
    sysCodeUse: 'Y',
    sysCodeSort: '',
    sysCodeRegUserName: '',
    sysCodeRegDateTime: formatDateTime(new Date().toISOString())
  });

  // 코드 카테고리 트리 구조
  const [codeCategories, setCodeCategories] = useState<CodeCategory[]>([]);
  
  // 트리 확장/축소 상태 관리
  const [isExpanded, setIsExpanded] = useState(false);
  const [treeKey, setTreeKey] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [shouldExpandRoot, setShouldExpandRoot] = useState(true);

  // API에서 시스템 코드 트리 데이터 가져오기
  const fetchSystemCodeTree = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/systemmanage/syscode/code_tree/');
      
      // ViewSet은 배열을 직접 반환
      let transformedData: CodeCategory[] = [];
      
      if (Array.isArray(response.data)) {
        transformedData = transformApiDataToTreeView(response.data);
        setCodeCategories(transformedData);
      } else if (response.data?.IndeAPIResponse && response.data.IndeAPIResponse.Result) {
        transformedData = transformApiDataToTreeView(response.data.IndeAPIResponse.Result);
        setCodeCategories(transformedData);
      } else if (response.data?.Result) {
        transformedData = transformApiDataToTreeView(response.data.Result);
        setCodeCategories(transformedData);
      } else {
        setCodeCategories([]);
      }
      
      // root 아이템을 자동으로 확장
      if (transformedData && transformedData.length > 0) {
        const currentExpandedItems = new Set(expandedItems);
        const rootIds = transformedData.map((item: CodeCategory) => item.id);
        rootIds.forEach(id => currentExpandedItems.add(id));
        setExpandedItems(currentExpandedItems);
      }
      
      setIsInitialLoad(false);
      setTimeout(() => {
        setShouldExpandRoot(false);
      }, 200);
      
    } catch (err: any) {
      console.error('시스템 코드 트리 조회 실패:', err);
      
      if (err.response?.status === 403 || 
          err.response?.data?.IndeAPIResponse?.ErrorCode === '40') {
        setError('권한이 없거나 토큰이 만료되었습니다. 자동 갱신을 시도합니다...');
        setTimeout(() => {
          fetchSystemCodeTree();
        }, 3000);
        return;
      } else {
        setError(err.response?.data?.message || err.response?.data?.IndeAPIResponse?.Message || err.response?.data?.Message || '시스템 코드를 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 백엔드 API 데이터를 TreeView 형식으로 변환
  const transformApiDataToTreeView = (apiData: SystemCode[]): CodeCategory[] => {
    if (!Array.isArray(apiData)) {
      return [];
    }
    
    const result = apiData.map(code => {
      const hasChildren = code.children && code.children.length > 0;
      return {
        id: code.sysCodeSid,
        name: code.sysCodeName,
        icon: Folder,
        children: hasChildren && code.children ? transformApiDataToTreeView(code.children) : undefined,
        isLeaf: !hasChildren
      };
    });
    
    return result;
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMounted(true);
      setIsInitialLoad(true);
      fetchSystemCodeTree();
    }
  }, []);

  // 새로고침 버튼 클릭 핸들러
  const handleRefresh = () => {
    fetchSystemCodeTree();
    setSearchResults([]);
    setSearchKeyword('');
  };

  // 전체 뎁스 펼치기 핸들러
  const handleExpandAll = () => {
    setIsExpanded(true);
    setIsCollapsed(false);
    
    if (codeCategories.length > 0) {
      const allIds = getAllItemIds(codeCategories);
      setExpandedItems(new Set(allIds));
    }
    
    setTreeKey(prev => prev + 1);
  };

  // 모든 아이템 ID를 수집하는 함수
  const getAllItemIds = (items: CodeCategory[]): string[] => {
    const ids: string[] = [];
    items.forEach(item => {
      ids.push(item.id);
      if (item.children && item.children.length > 0) {
        ids.push(...getAllItemIds(item.children));
      }
    });
    return ids;
  };

  const shouldExpandAll = isExpanded;
  
  const initialSelectedItemId = isInitialLoad && codeCategories.length > 0 
    ? codeCategories[0]?.id
    : undefined;

  // 전체 뎁스 닫기 핸들러
  const handleCollapseAll = () => {
    setIsExpanded(false);
    setIsCollapsed(true);
    
    if (codeCategories.length > 0) {
      const rootIds = codeCategories.map(item => item.id);
      setExpandedItems(new Set(rootIds));
    } else {
      setExpandedItems(new Set());
    }
    
    setTreeKey(prev => prev + 1);
  };

  // 트리에서 특정 노드만 업데이트하는 함수
  const updateTreeNodeInTree = (sysCodeSid: string, updateData: Partial<SystemCode>) => {
    const updateNode = (items: CodeCategory[]): CodeCategory[] => {
      return items.map(item => {
        if (item.id === sysCodeSid) {
          return {
            ...item,
            name: updateData.sysCodeName || item.name,
          };
        }
        if (item.children && item.children.length > 0) {
          return {
            ...item,
            children: updateNode(item.children),
          };
        }
        return item;
      });
    };

    setCodeCategories(prevCategories => updateNode(prevCategories));
  };

  // 트리 아이템 선택 핸들러
  const handleTreeItemSelect = async (item: TreeDataItem | undefined) => {
    if (item) {
      if (!expandedItems.has(item.id)) {
        setExpandedItems(prev => new Set([...prev, item.id]));
      }
      
      const systemCodeItem: SystemCode = {
        sysCodeSid: item.id,
        sysCodeParentsSid: '',
        sysCodeName: item.name,
        sysCodeValName: null,
        sysCodeVal: null,
        sysCodeVal1Name: null,
        sysCodeVal1: null,
        sysCodeVal2Name: null,
        sysCodeVal2: null,
        sysCodeVal3Name: null,
        sysCodeVal3: null,
        sysCodeVal4Name: null,
        sysCodeVal4: null,
        sysCodeUse: 'Y',
        sysCodeSort: null,
        sysCodeRegUserName: null,
        sysCodeRegDateTime: null,
        children: []
      };
      
      setSelectedCode(systemCodeItem);
      
      try {
        // 상세 정보 조회 API 호출
        const response = await apiClient.get(`/systemmanage/syscode/${item.id}/`);
        
        let detailData: SystemCode | null = null;
        
        // ViewSet은 객체를 직접 반환
        if (response.data) {
          // IndeAPIResponse 구조 처리
          if (response.data.IndeAPIResponse && response.data.IndeAPIResponse.Result) {
            detailData = response.data.IndeAPIResponse.Result;
          } else if (response.data.Result) {
            detailData = response.data.Result;
          } else {
            // ViewSet 기본 응답 (직접 객체 반환)
            detailData = response.data;
          }
        }
        
        if (detailData) {
          setCodeForm({
            sysCodeSid: detailData.sysCodeSid || item.id,
            sysCodeName: detailData.sysCodeName || item.name,
            sysCodeParentsSid: detailData.sysCodeParentsSid || '',
            sysCodeValName: detailData.sysCodeValName || '',
            sysCodeVal: detailData.sysCodeVal || '',
            sysCodeVal1Name: detailData.sysCodeVal1Name || '',
            sysCodeVal1: detailData.sysCodeVal1 || '',
            sysCodeVal2Name: detailData.sysCodeVal2Name || '',
            sysCodeVal2: detailData.sysCodeVal2 || '',
            sysCodeVal3Name: detailData.sysCodeVal3Name || '',
            sysCodeVal3: detailData.sysCodeVal3 || '',
            sysCodeVal4Name: detailData.sysCodeVal4Name || '',
            sysCodeVal4: detailData.sysCodeVal4 || '',
            sysCodeUse: detailData.sysCodeUse || 'Y',
            sysCodeSort: detailData.sysCodeSort?.toString() || '',
            sysCodeRegUserName: detailData.sysCodeRegUserName || '',
            sysCodeRegDateTime: formatDateTime(detailData.sysCodeRegDateTime)
          });
        } else {
          resetFormForItem(item);
        }
      } catch (err: any) {
        console.error('상세 정보 조회 실패:', err);
        resetFormForItem(item);
      }
    } else {
      setSelectedCode(null);
      resetForm();
    }
  };

  const resetFormForItem = (item: TreeDataItem) => {
    setCodeForm({
      sysCodeSid: item.id,
      sysCodeName: item.name,
      sysCodeParentsSid: '',
      sysCodeValName: '',
      sysCodeVal: '',
      sysCodeVal1Name: '',
      sysCodeVal1: '',
      sysCodeVal2Name: '',
      sysCodeVal2: '',
      sysCodeVal3Name: '',
      sysCodeVal3: '',
      sysCodeVal4Name: '',
      sysCodeVal4: '',
      sysCodeUse: 'Y',
      sysCodeSort: '',
      sysCodeRegUserName: '',
      sysCodeRegDateTime: formatDateTime(new Date().toISOString())
    });
  };

  // 검색 핸들러
  const handleSearch = () => {
    if (!searchKeyword.trim()) {
      setError('검색어를 입력해주세요.');
      return;
    }

    const searchData = searchInTree(codeCategories, searchKeyword.trim());
    
    if (searchData.length === 0) {
      setError(`"${searchKeyword}"에 대한 검색 결과가 없습니다.`);
      setSearchResults([]);
      return;
    }

    setSearchResults(searchData);
    
    const pathsToExpand = new Set<string>();
    
    searchData.forEach(result => {
      const path = findPathToNode(codeCategories, result.sysCodeSid);
      if (path) {
        path.forEach(nodeId => pathsToExpand.add(nodeId));
      }
    });

    setExpandedItems(prev => new Set([...prev, ...pathsToExpand]));
    
    if (searchData.length > 0) {
      const firstResult = searchData[0];
      handleTreeItemSelect({
        id: firstResult.sysCodeSid,
        name: firstResult.sysCodeName
      } as TreeDataItem);
    }

    setError(`"${searchKeyword}" 검색 결과: ${searchData.length}건`);
    setTimeout(() => setError(null), 3000);
  };

  // 트리에서 검색하는 함수
  const searchInTree = (nodes: CodeCategory[], keyword: string): SystemCode[] => {
    const results: SystemCode[] = [];
    
    const searchNode = (node: CodeCategory) => {
      if (node.id.toLowerCase().includes(keyword.toLowerCase()) || 
          node.name.toLowerCase().includes(keyword.toLowerCase())) {
        results.push({
          sysCodeSid: node.id,
          sysCodeParentsSid: '',
          sysCodeName: node.name,
          sysCodeValName: null,
          sysCodeVal: null,
          sysCodeVal1Name: null,
          sysCodeVal1: null,
          sysCodeVal2Name: null,
          sysCodeVal2: null,
          sysCodeVal3Name: null,
          sysCodeVal3: null,
          sysCodeVal4Name: null,
          sysCodeVal4: null,
          sysCodeUse: 'Y',
          sysCodeSort: null,
          sysCodeRegUserName: null,
          sysCodeRegDateTime: null,
          children: []
        });
      }
      
      if (node.children && node.children.length > 0) {
        node.children.forEach(searchNode);
      }
    };
    
    nodes.forEach(searchNode);
    return results;
  };

  // 트리에서 특정 노드까지의 경로를 찾는 함수
  const findPathToNode = (nodes: CodeCategory[], targetId: string): string[] | null => {
    for (const node of nodes) {
      if (node.id === targetId) {
        return [node.id];
      }
      if (node.children && node.children.length > 0) {
        const childPath = findPathToNode(node.children, targetId);
        if (childPath) {
          return [node.id, ...childPath];
        }
      }
    }
    return null;
  };

  // 검색 결과 클리어
  const clearSearch = () => {
    setSearchResults([]);
    setSearchKeyword('');
    setError(null);
  };

  // 코드 추가 핸들러
  const handleAddCode = async () => {
    try {
      if (!codeForm.sysCodeName) {
        setError('코드 이름은 필수 입력 항목입니다.');
        return;
      }

      setLoading(true);
      setError(null);

      // 시스템 코드가 있으면 부모 코드로 설정, 없으면 기존 부모 코드 값 사용
      const hasSystemCode = codeForm.sysCodeSid && codeForm.sysCodeSid.trim().length > 0;
      const parentCodeSid = hasSystemCode 
        ? codeForm.sysCodeSid.trim() 
        : (codeForm.sysCodeParentsSid?.trim() || null);

      console.log('등록 정보:', {
        sysCodeSid: codeForm.sysCodeSid,
        sysCodeParentsSid: codeForm.sysCodeParentsSid,
        hasSystemCode,
        parentCodeSid
      });

      const createData = {
        sysCodeParentsSid: parentCodeSid,
        sysCodeName: codeForm.sysCodeName,
        sysCodeValName: codeForm.sysCodeValName || null,
        sysCodeVal: codeForm.sysCodeVal || null,
        sysCodeVal1Name: codeForm.sysCodeVal1Name || null,
        sysCodeVal1: codeForm.sysCodeVal1 || null,
        sysCodeVal2Name: codeForm.sysCodeVal2Name || null,
        sysCodeVal2: codeForm.sysCodeVal2 || null,
        sysCodeVal3Name: codeForm.sysCodeVal3Name || null,
        sysCodeVal3: codeForm.sysCodeVal3 || null,
        sysCodeVal4Name: codeForm.sysCodeVal4Name || null,
        sysCodeVal4: codeForm.sysCodeVal4 || null,
        sysCodeUse: codeForm.sysCodeUse,
        sysCodeSort: codeForm.sysCodeSort ? parseInt(codeForm.sysCodeSort) : null
      };

      const response = await apiClient.post('/systemmanage/syscode/', createData);

      // ViewSet은 생성된 객체를 직접 반환 (201 Created)
      if (response.status === 201 || response.data) {
        setError(null);
        await fetchSystemCodeTree();
        // 등록에 사용한 부모 코드를 유지 (시스템 코드가 있었으면 그것을, 없었으면 기존 부모 코드를)
        resetForm();
        setCodeForm(prev => ({ ...prev, sysCodeParentsSid: parentCodeSid || '' }));
        setError('✅ 시스템 코드가 성공적으로 등록되었습니다.');
        setTimeout(() => setError(null), 3000);
      } else {
        const errorMessage = response.data?.message || response.data?.IndeAPIResponse?.Message || '시스템 코드 등록에 실패했습니다.';
        setError(errorMessage);
      }
    } catch (err: any) {
      console.error('시스템 코드 등록 실패:', err);
      
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.data?.IndeAPIResponse?.Message) {
        setError(err.response.data.IndeAPIResponse.Message);
      } else if (err.response?.data?.Message) {
        setError(err.response.data.Message);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('시스템 코드 등록 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 코드 수정 핸들러
  const handleEditCode = async () => {
    try {
      if (!codeForm.sysCodeSid || !codeForm.sysCodeName) {
        setError('시스템 코드와 코드 이름은 필수 입력 항목입니다.');
        return;
      }

      setLoading(true);
      setError(null);

      const updateData = {
        sysCodeSid: codeForm.sysCodeSid,
        sysCodeParentsSid: codeForm.sysCodeParentsSid,
        sysCodeName: codeForm.sysCodeName,
        sysCodeValName: codeForm.sysCodeValName,
        sysCodeVal: codeForm.sysCodeVal,
        sysCodeVal1Name: codeForm.sysCodeVal1Name,
        sysCodeVal1: codeForm.sysCodeVal1,
        sysCodeVal2Name: codeForm.sysCodeVal2Name,
        sysCodeVal2: codeForm.sysCodeVal2,
        sysCodeVal3Name: codeForm.sysCodeVal3Name,
        sysCodeVal3: codeForm.sysCodeVal3,
        sysCodeVal4Name: codeForm.sysCodeVal4Name,
        sysCodeVal4: codeForm.sysCodeVal4,
        sysCodeUse: codeForm.sysCodeUse,
        sysCodeSort: codeForm.sysCodeSort ? parseInt(codeForm.sysCodeSort) : null
      };

      const response = await apiClient.put(`/systemmanage/syscode/${codeForm.sysCodeSid}/`, updateData);

      // ViewSet은 수정된 객체를 직접 반환 (200 OK)
      if (response.status === 200 || response.data) {
        setError(null);
        const currentExpandedItems = new Set(expandedItems);
        updateTreeNodeInTree(codeForm.sysCodeSid, {
          sysCodeName: codeForm.sysCodeName,
          sysCodeVal: codeForm.sysCodeVal,
          sysCodeUse: codeForm.sysCodeUse,
          sysCodeSort: codeForm.sysCodeSort ? parseInt(codeForm.sysCodeSort) : null
        });
        setExpandedItems(currentExpandedItems);
        if (selectedCode) {
          const updatedSelectedCode = {
            ...selectedCode,
            sysCodeName: codeForm.sysCodeName,
            sysCodeVal: codeForm.sysCodeVal,
            sysCodeUse: codeForm.sysCodeUse,
            sysCodeSort: codeForm.sysCodeSort ? parseInt(codeForm.sysCodeSort) : null
          };
          setSelectedCode(updatedSelectedCode);
        }
        setError('✅ 시스템 코드가 성공적으로 수정되었습니다.');
        setTimeout(() => setError(null), 3000);
      } else {
        const errorMessage = response.data?.message || response.data?.IndeAPIResponse?.Message || '시스템 코드 수정에 실패했습니다.';
        setError(errorMessage);
      }
    } catch (err: any) {
      console.error('시스템 코드 수정 실패:', err);
      
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.data?.IndeAPIResponse?.Message) {
        setError(err.response.data.IndeAPIResponse.Message);
      } else if (err.response?.data?.Message) {
        setError(err.response.data.Message);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('시스템 코드 수정 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 폼 초기화 함수
  const resetForm = () => {
    setCodeForm({
      sysCodeSid: '',
      sysCodeParentsSid: codeForm.sysCodeParentsSid,
      sysCodeName: '',
      sysCodeValName: '',
      sysCodeVal: '',
      sysCodeVal1Name: '',
      sysCodeVal1: '',
      sysCodeVal2Name: '',
      sysCodeVal2: '',
      sysCodeVal3Name: '',
      sysCodeVal3: '',
      sysCodeVal4Name: '',
      sysCodeVal4: '',
      sysCodeUse: 'Y',
      sysCodeSort: '',
      sysCodeRegUserName: '',
      sysCodeRegDateTime: formatDateTime(new Date().toISOString())
    });
  };

  // 코드 삭제 핸들러
  const handleDeleteCode = async () => {
    try {
      if (!selectedCode) {
        setError('삭제할 코드를 선택해주세요.');
        return;
      }

      const isConfirmed = window.confirm(
        `"${selectedCode.sysCodeName}" 코드를 정말 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`
      );

      if (!isConfirmed) {
        return;
      }

      setLoading(true);
      setError(null);

      if (!selectedCode.sysCodeSid) {
        setError('유효하지 않은 코드 ID입니다.');
        return;
      }

      const response = await apiClient.delete(`/systemmanage/syscode/${selectedCode.sysCodeSid}/`);

      // ViewSet은 삭제 시 204 No Content 반환
      if (response.status === 204 || response.status === 200) {
        setError(null);
        await fetchSystemCodeTree();
        setSelectedCode(null);
        resetForm();
        setError('✅ 시스템 코드가 성공적으로 삭제되었습니다.');
        setTimeout(() => setError(null), 3000);
      } else {
        const errorMessage = response.data?.message || response.data?.IndeAPIResponse?.Message || '시스템 코드 삭제에 실패했습니다.';
        setError(errorMessage);
      }
    } catch (err: any) {
      console.error('시스템 코드 삭제 실패:', err);
      
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.data?.IndeAPIResponse?.Message) {
        setError(err.response.data.IndeAPIResponse.Message);
      } else if (err.response?.data?.Message) {
        setError(err.response.data.Message);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('시스템 코드 삭제 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="h-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">시스템 코드 관리</h1>
        <p className="text-gray-600">시스템 코드를 조회하고 관리할 수 있습니다.</p>
      </div>

      <div className="flex h-full space-x-4">
        {/* 왼쪽: 코드 목록 */}
        <div className="w-1/3 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-800 font-bold text-sm">리스트</h3>
              {mounted && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs px-2 py-1 h-6"
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  <RotateCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  새로고침
                </Button>
              )}
            </div>
            
            {/* 검색 입력 */}
            {mounted && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Input
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="text-xs h-8"
                    placeholder="코드ID 또는 코드명으로 검색..."
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button 
                    size="sm" 
                    className="text-xs px-2 py-1 h-6"
                    onClick={handleSearch}
                  >
                    <Search className="w-3 h-3" />
                  </Button>
                  {(searchKeyword || searchResults.length > 0) && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-xs px-2 py-1 h-6"
                      onClick={clearSearch}
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                
                {/* 검색 결과 표시 */}
                {(searchKeyword || searchResults.length > 0) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-blue-700 text-xs font-medium">
                        🔍 검색어: "{searchKeyword}"
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-xs px-2 py-1 h-5 bg-white hover:bg-blue-100"
                        onClick={clearSearch}
                      >
                        ✕
                      </Button>
                    </div>
                    
                    {searchResults.length > 0 ? (
                      <>
                        <div className="text-blue-600 text-xs mb-2">
                          📊 검색 결과: {searchResults.length}건
                        </div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {searchResults.slice(0, 8).map((result) => (
                            <div 
                              key={result.sysCodeSid}
                              className="flex items-center justify-between p-1 bg-white rounded border border-blue-200 hover:bg-blue-100 cursor-pointer transition-colors"
                              onClick={() => {
                                handleTreeItemSelect({
                                  id: result.sysCodeSid,
                                  name: result.sysCodeName
                                } as TreeDataItem);
                                
                                const path = findPathToNode(codeCategories, result.sysCodeSid);
                                if (path) {
                                  setExpandedItems(prev => new Set([...prev, ...path]));
                                }
                              }}
                            >
                              <div className="flex items-center space-x-2">
                                <span className="text-blue-600 text-xs font-mono bg-blue-100 px-1 py-0.5 rounded">
                                  {result.sysCodeSid}
                                </span>
                                <span className="text-blue-700 text-xs">
                                  {result.sysCodeName}
                                </span>
                              </div>
                              <span className="text-blue-500 text-xs">→</span>
                            </div>
                          ))}
                          {searchResults.length > 8 && (
                            <div className="text-blue-600 text-xs text-center py-1 bg-blue-100 rounded">
                              ... 외 {searchResults.length - 8}건 더 있음
                            </div>
                          )}
                        </div>
                      </>
                    ) : searchKeyword && (
                      <div className="text-orange-600 text-xs text-center py-2">
                        ❌ 검색 결과가 없습니다.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {mounted && (
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className={`text-xs px-2 py-1 h-6 ${isExpanded ? 'bg-blue-100 border-blue-300' : ''}`}
                    onClick={handleExpandAll}
                  >
                    {isExpanded ? '전체 펼침 ✓' : '전체 펼침'}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className={`text-xs px-2 py-1 h-6 ${isCollapsed ? 'bg-blue-100 border-blue-300' : ''}`}
                    onClick={handleCollapseAll}
                  >
                    {isCollapsed ? '전체 접음 ✓' : '전체 접음'}
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 overflow-y-auto" style={{ height: 'calc(100vh - 280px)' }}>
            {/* 로딩 상태 */}
            {loading && (
              <div className="flex items-center justify-center h-32">
                <div className="text-gray-500 text-sm">로딩 중...</div>
              </div>
            )}
            
            {/* 에러 상태 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <div className="text-red-700 text-sm">{error}</div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs mt-2"
                  onClick={handleRefresh}
                >
                  다시 시도
                </Button>
              </div>
            )}
            
            {/* 트리 뷰 */}
            {mounted && !loading && !error && (
              <TreeView
                key={treeKey}
                data={codeCategories}
                initialSelectedItemId={initialSelectedItemId}
                onSelectChange={handleTreeItemSelect}
                expandAll={isExpanded}
                expandRootOnly={shouldExpandRoot}
                defaultNodeIcon={Folder}
                defaultLeafIcon={Folder}
                expandedItems={expandedItems}
                onExpandedChange={setExpandedItems}
              />
            )}
            
            {/* 데이터가 없는 경우 */}
            {!loading && !error && codeCategories.length === 0 && (
              <div className="text-center text-gray-500 text-sm py-8">
                시스템 코드가 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽: 항목 입력 폼 */}
        <div className="flex-1">
          <Card className="border-blue-100 bg-gradient-to-r from-blue-40 to-indigo-50">
            <CardHeader className="bg-blue-100 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h3 className="text-blue-700 font-semibold text-sm">항목</h3>
                  {selectedCode && (
                    <div className="flex items-center space-x-2 px-3 py-1 bg-blue-200 rounded-full">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span className="text-blue-800 text-xs font-medium">
                        {selectedCode.sysCodeName} 상세정보
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    size="sm" 
                    className="flex items-center space-x-1 bg-green-500 hover:bg-green-600 text-white border-0 text-sm px-3 py-1"
                    onClick={handleAddCode}
                    disabled={loading}
                  >
                    <Plus className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    <span>{loading ? '등록 중...' : '등록'}</span>
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex items-center space-x-1 bg-blue-400 hover:bg-blue-500 text-white border-white text-sm px-3 py-1"
                    onClick={handleEditCode}
                  >
                    <Edit className="w-3 h-3" />
                    <span>수정</span>
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex items-center space-x-1 bg-red-400 hover:bg-red-500 text-white border-white text-sm px-3 py-1"
                    onClick={handleDeleteCode}
                    disabled={loading || !selectedCode || !selectedCode.sysCodeSid}
                  >
                    <Trash2 className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    <span>{loading ? '삭제 중...' : '삭제'}</span>
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex items-center space-x-1 bg-gray-400 hover:bg-gray-500 text-white border-white text-sm px-3 py-1"
                    onClick={resetForm}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-4 pb-4 px-4">
              {/* 첫 번째 행: 기본 정보 */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-blue-700 font-semibold text-xs">시스템 코드 *</label>
                  <Input 
                    value={codeForm.sysCodeSid}
                    onChange={(e) => setCodeForm({...codeForm, sysCodeSid: e.target.value})}
                    className="border-gray-300 bg-gray-100 text-sm py-1 h-8 focus-visible:ring-0 focus-visible:ring-offset-0 cursor-not-allowed"
                    readOnly
                  />
                </div>
                
                <div>
                  <label className="text-blue-700 font-semibold text-xs">부모 코드</label>
                  <Input
                    value={codeForm.sysCodeParentsSid}
                    onChange={(e) => setCodeForm({...codeForm, sysCodeParentsSid: e.target.value})}
                    className="border-gray-300 bg-gray-100 text-sm py-1 h-8 focus-visible:ring-0 focus-visible:ring-offset-0 cursor-not-allowed"
                    readOnly
                  />
                </div>
                
                <div>
                  <label className="text-blue-700 font-semibold text-xs">코드 이름 *</label>
                  <Input
                    value={codeForm.sysCodeName}
                    onChange={(e) => setCodeForm({...codeForm, sysCodeName: e.target.value})}
                    className="border-blue-300 bg-white text-sm py-1 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              {/* 두 번째 행: 값 관련 필드들 */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-blue-700 font-semibold text-xs">값 이름</label>
                  <Input
                    value={codeForm.sysCodeValName}
                    onChange={(e) => setCodeForm({...codeForm, sysCodeValName: e.target.value})}
                    className="border-blue-300 bg-white text-sm py-1 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                
                <div>
                  <label className="text-blue-700 font-semibold text-xs">값</label>
                  <Input
                    value={codeForm.sysCodeVal}
                    onChange={(e) => setCodeForm({...codeForm, sysCodeVal: e.target.value})}
                    className="border-blue-300 bg-white text-sm py-1 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              {/* 세 번째 행: 추가 값 필드들 */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-blue-700 font-semibold text-xs">값1 이름</label>
                  <Input
                    value={codeForm.sysCodeVal1Name}
                    onChange={(e) => setCodeForm({...codeForm, sysCodeVal1Name: e.target.value})}
                    className="border-blue-300 bg-white text-sm py-1 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                
                <div>
                  <label className="text-blue-700 font-semibold text-xs">값1</label>
                  <Input
                    value={codeForm.sysCodeVal1}
                    onChange={(e) => setCodeForm({...codeForm, sysCodeVal1: e.target.value})}
                    className="border-blue-300 bg-white text-sm py-1 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              {/* 네 번째 행: 추가 값 필드들 */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-blue-700 font-semibold text-xs">값2 이름</label>
                  <Input
                    value={codeForm.sysCodeVal2Name}
                    onChange={(e) => setCodeForm({...codeForm, sysCodeVal2Name: e.target.value})}
                    className="border-blue-300 bg-white text-sm py-1 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                
                <div>
                  <label className="text-blue-700 font-semibold text-xs">값2</label>
                  <Input 
                    value={codeForm.sysCodeVal2}
                    onChange={(e) => setCodeForm({...codeForm, sysCodeVal2: e.target.value})}
                    className="border-blue-300 bg-white text-sm py-1 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              {/* 다섯 번째 행: 추가 값 필드들 */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-blue-700 font-semibold text-xs">값3 이름</label>
                  <Input 
                    value={codeForm.sysCodeVal3Name}
                    onChange={(e) => setCodeForm({...codeForm, sysCodeVal3Name: e.target.value})}
                    className="border-blue-300 bg-white text-sm py-1 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                
                <div>
                  <label className="text-blue-700 font-semibold text-xs">값3</label>
                  <Input 
                    value={codeForm.sysCodeVal3}
                    onChange={(e) => setCodeForm({...codeForm, sysCodeVal3: e.target.value})}
                    className="border-blue-300 bg-white text-sm py-1 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              {/* 여섯 번째 행: 추가 값 필드들 */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-blue-700 font-semibold text-xs">값4 이름</label>
                  <Input 
                    value={codeForm.sysCodeVal4Name}
                    onChange={(e) => setCodeForm({...codeForm, sysCodeVal4Name: e.target.value})}
                    className="border-blue-300 bg-white text-sm py-1 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                
                <div>
                  <label className="text-blue-700 font-semibold text-xs">값4</label>
                  <Input 
                    value={codeForm.sysCodeVal4}
                    onChange={(e) => setCodeForm({...codeForm, sysCodeVal4: e.target.value})}
                    className="border-blue-300 bg-white text-sm py-1 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              {/* 일곱 번째 행: 설정 및 관리 필드들 */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-blue-700 font-semibold text-xs">사용 여부</label>
                  <div className="h-8 flex items-center">
                    <RadioGroup 
                      value={codeForm.sysCodeUse} 
                      onValueChange={(value) => setCodeForm({...codeForm, sysCodeUse: value})}
                      className="flex space-x-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Y" className="text-blue-600 w-5 h-5" />
                        <Label className="text-blue-700 text-sm">사용함</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="N" className="text-blue-600 w-5 h-5" />
                        <Label className="text-blue-700 text-sm">사용안함</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
                
                <div>
                  <label className="text-blue-700 font-semibold text-xs">코드 정렬</label>
                  <Input 
                    value={codeForm.sysCodeSort}
                    onChange={(e) => setCodeForm({...codeForm, sysCodeSort: e.target.value})}
                    className="border-blue-300 bg-white text-sm py-1 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                
                <div>
                  <label className="text-blue-700 font-semibold text-xs">등록자</label>
                  <Input 
                    value={codeForm.sysCodeRegUserName}
                    onChange={(e) => setCodeForm({...codeForm, sysCodeRegUserName: e.target.value})}
                    className="border-gray-300 bg-gray-100 text-sm py-1 h-8 focus-visible:ring-0 focus-visible:ring-offset-0 cursor-not-allowed"
                    readOnly
                  />
                </div>
              </div>

              {/* 여덟 번째 행: 등록일시 */}
              <div className="mb-4">
                <div>
                  <label className="text-blue-700 font-semibold text-xs">등록일시</label>
                  <Input 
                    value={codeForm.sysCodeRegDateTime}
                    onChange={(e) => {
                      const formattedValue = formatDateTime(e.target.value);
                      setCodeForm({...codeForm, sysCodeRegDateTime: formattedValue});
                    }}
                    className="border-gray-300 bg-gray-100 text-sm py-1 h-8 focus-visible:ring-0 focus-visible:ring-offset-0 cursor-not-allowed"
                    readOnly
                  />
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

