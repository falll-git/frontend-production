import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import SjCursorNavigation from './SjCursorNavigation';

it('returns to a visited cursor without inventing a global page total',()=>{
  const navigate=vi.fn();
  const view=render(<SjCursorNavigation label="publikasi" count={20} cursor="" next="opaque-next" onNavigate={navigate}/>);
  fireEvent.click(screen.getByRole('button',{name:'publikasi berikutnya'}));
  expect(navigate).toHaveBeenLastCalledWith('opaque-next');
  view.rerender(<SjCursorNavigation label="publikasi" count={3} cursor="opaque-next" next={null} onNavigate={navigate}/>);
  fireEvent.click(screen.getByRole('button',{name:'publikasi sebelumnya'}));
  expect(navigate).toHaveBeenLastCalledWith('');
  view.rerender(<SjCursorNavigation key="new-filter" label="publikasi" count={3} cursor="unknown" next={null} onNavigate={navigate}/>);
  expect(screen.queryByRole('button',{name:'publikasi sebelumnya'})).not.toBeInTheDocument();
});

it('labels only the current count, follows the API cursor, and returns to the first page',()=>{
  const navigate=vi.fn();
  const {rerender}=render(<SjCursorNavigation label="publikasi" count={20} cursor="" next="next-from-api" onNavigate={navigate}/>);
  expect(screen.getByText('20 publikasi pada halaman ini')).toBeInTheDocument();
  expect(screen.queryByText(/total/i)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'publikasi berikutnya'}));
  expect(navigate).toHaveBeenCalledWith('next-from-api');
  rerender(<SjCursorNavigation label="publikasi" count={3} cursor="next-from-api" next={null} onNavigate={navigate}/>);
  expect(screen.getByRole('button',{name:'publikasi berikutnya'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Kembali ke awal'}));
  expect(navigate).toHaveBeenLastCalledWith('');
});
