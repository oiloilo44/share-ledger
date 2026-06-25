import { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Stack,
  Button,
  Card,
  CardContent,
  Divider,
  Paper,
  Alert,
} from '@mui/material';
import { AmountInput, BottomSheet, ContentSkeleton } from '../components';
import { useToastStore } from '../stores/toastStore';

// 에러를 발생시키는 테스트 컴포넌트
const ErrorThrowingComponent = () => {
  throw new Error('테스트 에러: ErrorBoundary가 이 에러를 캐치합니다.');
};

export const ComponentDemoPage = () => {
  const [amount, setAmount] = useState(0);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [throwError, setThrowError] = useState(false);
  const { showToast } = useToastStore();

  const handleAmountChange = (value: number, newType: 'income' | 'expense') => {
    setAmount(value);
    setType(newType);
  };

  const handleShowToast = (severity: 'success' | 'error' | 'warning' | 'info') => {
    const messages = {
      success: '작업이 성공적으로 완료되었습니다!',
      error: '오류가 발생했습니다. 다시 시도해주세요.',
      warning: '주의가 필요한 사항이 있습니다.',
      info: '알림: 새로운 업데이트가 있습니다.',
    };
    showToast(messages[severity], {
      severity,
      title: severity === 'success' ? '성공' : undefined,
    });
  };

  const handleAsyncError = async () => {
    try {
      // 비동기 에러 시뮬레이션
      await new Promise((_, reject) => {
        setTimeout(() => reject(new Error('비동기 작업 실패')), 1000);
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : '알 수 없는 에러가 발생했습니다.', {
        severity: 'error',
        title: '에러',
      });
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h1" gutterBottom sx={{ mb: 4 }}>
        UI 컴포넌트 데모
      </Typography>

      <Stack spacing={4}>
        {/* AmountInput Demo */}
        <Card>
          <CardContent>
            <Typography variant="h3" gutterBottom>
              1. AmountInput (금액 입력)
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              토스 스타일의 금액 입력 컴포넌트입니다. 수입/지출을 전환하고 숫자 키패드로 입력할 수
              있습니다.
            </Typography>
            <Paper elevation={0} sx={{ p: 3, backgroundColor: 'background.default' }}>
              <AmountInput value={amount} type={type} onChange={handleAmountChange} />
            </Paper>
            <Box sx={{ mt: 2, p: 2, backgroundColor: 'background.default', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">
                현재 값: {type === 'income' ? '+' : '-'}₩{amount.toLocaleString('ko-KR')}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* BottomSheet Demo */}
        <Card>
          <CardContent>
            <Typography variant="h3" gutterBottom>
              2. BottomSheet (바텀 시트)
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              모바일 친화적인 바텀 시트 모달입니다. 드래그로 닫을 수 있습니다.
            </Typography>
            <Button variant="contained" onClick={() => setBottomSheetOpen(true)}>
              바텀 시트 열기
            </Button>
            <BottomSheet
              open={bottomSheetOpen}
              onClose={() => setBottomSheetOpen(false)}
              title="내역 추가"
            >
              <Stack spacing={3}>
                <Typography variant="body1">여기에 내역 추가 폼이 들어갑니다.</Typography>
                <AmountInput value={amount} type={type} onChange={handleAmountChange} />
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={() => {
                    setBottomSheetOpen(false);
                    handleShowToast('success');
                  }}
                >
                  추가하기
                </Button>
              </Stack>
            </BottomSheet>
          </CardContent>
        </Card>

        {/* Toast Demo */}
        <Card>
          <CardContent>
            <Typography variant="h3" gutterBottom>
              3. Toast (토스트 알림)
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              다양한 상태의 토스트 알림을 표시할 수 있습니다.
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <Button
                variant="contained"
                color="success"
                onClick={() => handleShowToast('success')}
              >
                성공 토스트
              </Button>
              <Button variant="contained" color="error" onClick={() => handleShowToast('error')}>
                에러 토스트
              </Button>
              <Button
                variant="contained"
                color="warning"
                onClick={() => handleShowToast('warning')}
              >
                경고 토스트
              </Button>
              <Button variant="contained" color="info" onClick={() => handleShowToast('info')}>
                정보 토스트
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Skeleton Demo */}
        <Card>
          <CardContent>
            <Typography variant="h3" gutterBottom>
              4. Skeleton (로딩 상태)
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              컨텐츠 로딩 중 표시되는 스켈레톤 UI입니다.
            </Typography>
            <Button
              variant="contained"
              onClick={() => setShowSkeleton(!showSkeleton)}
              sx={{ mb: 3 }}
            >
              {showSkeleton ? '실제 컨텐츠 보기' : '스켈레톤 보기'}
            </Button>
            {showSkeleton ? (
              <ContentSkeleton variant="list" items={3} />
            ) : (
              <Stack spacing={2}>
                {[1, 2, 3].map((i) => (
                  <Paper
                    key={i}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      boxShadow: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        backgroundColor: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 700,
                      }}
                    >
                      {i}
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body1" fontWeight={600}>
                        항목 {i}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        설명 텍스트입니다
                      </Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={700} color="primary">
                      ₩{(i * 10000).toLocaleString('ko-KR')}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* Button Styles Demo */}
        <Card>
          <CardContent>
            <Typography variant="h3" gutterBottom>
              5. Button Styles (버튼 스타일)
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              토스 스타일의 버튼 디자인입니다. 호버와 클릭 효과가 적용되어 있습니다.
            </Typography>
            <Stack spacing={3}>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                <Button variant="contained" size="large">
                  Large Button
                </Button>
                <Button variant="contained">Medium Button</Button>
                <Button variant="contained" size="small">
                  Small Button
                </Button>
              </Stack>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                <Button variant="contained" color="primary">
                  Primary
                </Button>
                <Button variant="contained" color="success">
                  Success
                </Button>
                <Button variant="contained" color="error">
                  Error
                </Button>
              </Stack>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                <Button variant="outlined">Outlined</Button>
                <Button variant="text">Text</Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Typography Demo */}
        <Card>
          <CardContent>
            <Typography variant="h3" gutterBottom>
              6. Typography (타이포그래피)
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={2}>
              <Box>
                <Typography variant="h1">Heading 1 (H1)</Typography>
                <Typography variant="body2" color="text.secondary">
                  fontSize: 2.25rem, fontWeight: 800
                </Typography>
              </Box>
              <Box>
                <Typography variant="h2">Heading 2 (H2)</Typography>
                <Typography variant="body2" color="text.secondary">
                  fontSize: 1.75rem, fontWeight: 800
                </Typography>
              </Box>
              <Box>
                <Typography variant="h3">Heading 3 (H3)</Typography>
                <Typography variant="body2" color="text.secondary">
                  fontSize: 1.5rem, fontWeight: 700
                </Typography>
              </Box>
              <Box>
                <Typography variant="body1">Body 1 - 본문 텍스트입니다.</Typography>
                <Typography variant="body2" color="text.secondary">
                  fontSize: 1.125rem, fontWeight: 600
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2">Body 2 - 작은 본문 텍스트입니다.</Typography>
                <Typography variant="body2" color="text.secondary">
                  fontSize: 1rem, fontWeight: 500
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* ErrorBoundary Demo */}
        {import.meta.env.DEV && (
          <Card>
            <CardContent>
              <Typography variant="h3" gutterBottom>
                7. ErrorBoundary (에러 처리)
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                앱 전체를 감싸고 있는 ErrorBoundary 컴포넌트를 테스트할 수 있습니다.
                <br />
                <strong>주의:</strong> 렌더링 에러는 페이지 전체가 에러 화면으로 전환됩니다.
              </Typography>

              <Alert severity="warning" sx={{ mb: 3 }}>
                이 섹션은 개발 모드에서만 표시됩니다. 프로덕션 빌드에서는 숨겨집니다.
              </Alert>

              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                    1. 렌더링 에러 테스트 (ErrorBoundary)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    버튼을 클릭하면 ErrorBoundary가 에러를 캐치하여 사용자 친화적인 에러 화면을
                    보여줍니다.
                  </Typography>
                  <Button variant="contained" color="error" onClick={() => setThrowError(true)}>
                    렌더링 에러 발생시키기
                  </Button>
                  {throwError && <ErrorThrowingComponent />}
                </Box>

                <Divider />

                <Box>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                    2. 비동기 에러 테스트 (Toast)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    비동기 작업 실패 시 Toast로 에러 메시지를 표시합니다. ErrorBoundary는 비동기
                    에러를 캐치하지 않습니다.
                  </Typography>
                  <Button variant="contained" color="warning" onClick={handleAsyncError}>
                    비동기 에러 발생시키기
                  </Button>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                    3. 에러 로그 확인
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    localStorage에 저장된 에러 로그 개수를 확인합니다.
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      const logs = localStorage.getItem('error_logs');
                      if (logs) {
                        const count = JSON.parse(logs).length;
                        showToast(
                          `${count}개의 에러 로그가 저장되어 있습니다.`,
                          {
                            severity: 'info',
                            title: '에러 로그',
                          },
                        );
                      } else {
                        showToast('저장된 에러 로그가 없습니다.', {
                          severity: 'info',
                          title: '에러 로그',
                        });
                      }
                    }}
                  >
                    에러 로그 확인
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Container>
  );
};
