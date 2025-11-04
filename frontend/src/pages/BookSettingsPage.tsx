/**
 * 가계부 설정 페이지
 * 멤버 관리 (초대, 역할 변경, 삭제)
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  Typography,
  Alert,
  Divider,
} from '@mui/material';
import { ArrowBack, PersonAdd, Delete } from '@mui/icons-material';
import { useBooks } from '../hooks/useBooks';
import {
  useMembers,
  useInviteMember,
  useUpdateMemberRole,
  useRemoveMember,
} from '../hooks/useMembers';
import { BookRole, type BookMemberInvite } from '../types/books';
import { APIError } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

interface InviteDialogState {
  open: boolean;
}

interface InviteFormData {
  email: string;
  role: BookRole;
}

export const BookSettingsPage = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const { data: books } = useBooks();
  const { data: members, isLoading, error } = useMembers(bookId!);
  const inviteMember = useInviteMember(bookId!);
  const updateMemberRole = useUpdateMemberRole(bookId!);
  const removeMember = useRemoveMember(bookId!);

  const [inviteDialog, setInviteDialog] = useState<InviteDialogState>({ open: false });
  const [inviteForm, setInviteForm] = useState<InviteFormData>({
    email: '',
    role: BookRole.EDITOR,
  });

  const currentBook = books?.find((book) => book.id === bookId);
  const isOwner = currentBook?.current_role === BookRole.OWNER;

  const handleOpenInviteDialog = () => {
    setInviteDialog({ open: true });
    setInviteForm({ email: '', role: BookRole.EDITOR });
  };

  const handleCloseInviteDialog = () => {
    setInviteDialog({ open: false });
  };

  const handleInvite = async () => {
    if (!inviteForm.email.trim()) return;

    const payload: BookMemberInvite = {
      email: inviteForm.email.trim(),
      role: inviteForm.role,
    };

    try {
      await inviteMember.mutateAsync(payload);
      handleCloseInviteDialog();
      alert('멤버를 성공적으로 초대했습니다.');
    } catch (error) {
      console.error('멤버 초대 실패:', error);
      const errorMessage = error instanceof APIError ? error.message : '멤버 초대에 실패했습니다.';
      alert(errorMessage);
    }
  };

  const handleRoleChange = async (memberUserId: string, newRole: BookRole) => {
    if (!window.confirm('멤버의 역할을 변경하시겠습니까?')) {
      return;
    }

    try {
      await updateMemberRole.mutateAsync({
        memberUserId,
        data: { role: newRole },
      });
      alert('역할이 성공적으로 변경되었습니다.');
    } catch (error) {
      console.error('역할 변경 실패:', error);
      const errorMessage = error instanceof APIError ? error.message : '역할 변경에 실패했습니다.';
      alert(errorMessage);
    }
  };

  const handleRemoveMember = async (memberUserId: string, memberEmail: string) => {
    if (!window.confirm(`"${memberEmail}" 멤버를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await removeMember.mutateAsync(memberUserId);
      alert('멤버가 성공적으로 삭제되었습니다.');
    } catch (error) {
      console.error('멤버 삭제 실패:', error);
      const errorMessage = error instanceof APIError ? error.message : '멤버 삭제에 실패했습니다.';
      alert(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    const errorMessage =
      error instanceof APIError ? error.message : '멤버 목록을 불러오는데 실패했습니다.';
    return (
      <Box p={3}>
        <Alert severity="error">{errorMessage}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* 헤더 */}
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate(`/books/${bookId}`)} sx={{ mr: 1 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          {currentBook?.name} - 설정
        </Typography>
        {isOwner && (
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={handleOpenInviteDialog}
            disabled={inviteMember.isPending}
          >
            멤버 초대
          </Button>
        )}
      </Box>

      {/* 권한 안내 */}
      {!isOwner && (
        <Alert severity="info" sx={{ mb: 3 }}>
          멤버 초대 및 삭제는 가계부 소유자만 가능합니다.
        </Alert>
      )}

      {/* 멤버 목록 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            멤버 목록 ({members?.length || 0}명)
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {!members || members.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary">
                아직 멤버가 없습니다.
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {members.map((member, index) => {
                const isCurrentUser = member.user_id === user?.id;
                const canEditRole = isOwner && !isCurrentUser;
                const canRemove = isOwner && !isCurrentUser;

                return (
                  <Box key={member.user_id}>
                    <ListItem
                      sx={{ py: 2, px: 1 }}
                      secondaryAction={
                        <Box display="flex" alignItems="center" gap={1}>
                          {canEditRole ? (
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                              <Select
                                value={member.role}
                                onChange={(e) =>
                                  handleRoleChange(member.user_id, e.target.value as BookRole)
                                }
                                disabled={updateMemberRole.isPending}
                              >
                                <MenuItem value={BookRole.OWNER}>소유자</MenuItem>
                                <MenuItem value={BookRole.EDITOR}>편집자</MenuItem>
                              </Select>
                            </FormControl>
                          ) : (
                            <Chip
                              label={member.role === BookRole.OWNER ? '소유자' : '편집자'}
                              color={member.role === BookRole.OWNER ? 'primary' : 'default'}
                              size="small"
                            />
                          )}
                          {canRemove && (
                            <IconButton
                              edge="end"
                              onClick={() => handleRemoveMember(member.user_id, member.email)}
                              disabled={removeMember.isPending}
                            >
                              <Delete />
                            </IconButton>
                          )}
                        </Box>
                      }
                    >
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body1">
                              {member.full_name || member.email}
                            </Typography>
                            {isCurrentUser && <Chip label="나" color="success" size="small" />}
                          </Box>
                        }
                        secondary={
                          <Box display="flex" flexDirection="column" gap={0.5} mt={0.5}>
                            {member.full_name && (
                              <Typography variant="body2" color="text.secondary">
                                {member.email}
                              </Typography>
                            )}
                            <Typography variant="body2" color="text.secondary">
                              가입일:{' '}
                              {new Date(member.joined_at).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < members.length - 1 && <Divider />}
                  </Box>
                );
              })}
            </List>
          )}
        </CardContent>
      </Card>

      {/* 멤버 초대 다이얼로그 */}
      <Dialog open={inviteDialog.open} onClose={handleCloseInviteDialog} maxWidth="sm" fullWidth>
        <DialogTitle>멤버 초대</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="이메일"
              type="email"
              fullWidth
              value={inviteForm.email}
              onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="user@example.com"
              helperText="초대할 사용자의 이메일 주소를 입력하세요"
            />
            <FormControl fullWidth>
              <InputLabel>역할</InputLabel>
              <Select
                value={inviteForm.role}
                label="역할"
                onChange={(e) =>
                  setInviteForm((prev) => ({ ...prev, role: e.target.value as BookRole }))
                }
              >
                <MenuItem value={BookRole.OWNER}>소유자</MenuItem>
                <MenuItem value={BookRole.EDITOR}>편집자</MenuItem>
              </Select>
            </FormControl>
            <Alert severity="info">
              <Typography variant="body2">
                • <strong>소유자</strong>: 가계부 삭제 및 멤버 관리 가능
                <br />• <strong>편집자</strong>: 내역 추가/수정/삭제 가능
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseInviteDialog}>취소</Button>
          <Button
            onClick={handleInvite}
            variant="contained"
            disabled={!inviteForm.email.trim() || inviteMember.isPending}
          >
            초대
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
