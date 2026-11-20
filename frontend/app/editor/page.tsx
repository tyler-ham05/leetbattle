import EditorLayout from './components/editor-layout';
import HomeTopBar from '../_home/components/topbar';
import { EditorProvider } from './context';
import RequireAuth from '../login/protected';
import PageLoader from '../_shared/page-loader';

// Practice: just the problems and the editor. No scores, timer or team chat,
// which only mean something in a match (US-5-T-19).
export default function editor() {
	return (
		<RequireAuth>
			<EditorProvider>
				<div className="flex h-screen flex-col">
					<PageLoader variant="pen" />
					<HomeTopBar />
					<EditorLayout />
				</div>
			</EditorProvider>
		</RequireAuth>
	);
}
