import { render } from '@testing-library/react';
import { composeStories } from '@storybook/react';
import * as ConfirmDialogStories from './ConfirmDialog.stories';
import * as ToastStories from './ToastNotification.stories';
import * as FilterBarStories from './FilterBar.stories';

describe('Storybook 시각 회귀 스냅샷', () => {
  const composedStories = [
    ['ConfirmDialog/Danger', composeStories(ConfirmDialogStories).Danger],
    ['ConfirmDialog/Success', composeStories(ConfirmDialogStories).Success],
    ['ToastNotification/Warning', composeStories(ToastStories).Warning],
    ['ToastNotification/Error', composeStories(ToastStories).Error],
    ['FilterBar/Playground', composeStories(FilterBarStories).Playground],
  ] as const;

  it.each(composedStories)('%s 렌더링 스냅샷 유지', (_name, Story) => {
    const { container } = render(<Story />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
