import { screen } from '@testing-library/react';
import { expect, it } from 'vitest';

it('mounts the app into the #root element', async () => {
  document.body.innerHTML = '<div id="root"></div>';
  await import('./main');
  expect(await screen.findByRole('heading', { name: 'CI/CD Todo Demo' })).toBeInTheDocument();
});
