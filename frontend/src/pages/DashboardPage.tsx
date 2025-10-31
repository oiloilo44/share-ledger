import Grid2 from '@mui/material/Grid2';
import { Card, CardContent, Typography } from '@mui/material';

export const DashboardPage = () => (
  <Grid2 container spacing={3} columns={12}>
    <Grid2 size={{ xs: 12, md: 6 }}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h5" gutterBottom>
            가족 가계부를 시작해보세요
          </Typography>
          <Typography color="text.secondary">
            ShareLedger는 공동 가계부를 쉽고 안전하게 관리할 수 있는 협업 도구입니다. 좌측 메뉴에서
            새로운 가계부를 생성하고 멤버를 초대해보세요.
          </Typography>
        </CardContent>
      </Card>
    </Grid2>
    <Grid2 size={{ xs: 12, md: 6 }}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            개발 진행 상황
          </Typography>
          <Typography color="text.secondary">
            API와 프런트엔드가 아직 연결되지 않았습니다. 기능 구현이 완료되면 이 영역에서 최근
            내역과 예정된 반복 항목을 확인할 수 있습니다.
          </Typography>
        </CardContent>
      </Card>
    </Grid2>
  </Grid2>
);
