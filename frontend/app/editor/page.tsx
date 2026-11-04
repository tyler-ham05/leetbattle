import Monaco from './components/monaco';
import QuestionPanel from './components/question-panel';
import TestCasesPanel from './components/test-cases-panel';
import SubmitBar from './components/submit-bar';
import TopBar from './components/top-bar';
import { EditorProvider } from './context';
import RequireAuth from '../login/protected';

export default function editor() {
	return (
		<RequireAuth>
			<EditorProvider>
				<div>
					<TopBar/>
					<div className="flex h-screen bg-page font-sans">

						<div className="w-1/2 border-r border-line">
							<QuestionPanel />
						</div>

						<div className="flex w-1/2 flex-col">
							<div className="h-3/5 min-h-0">
								<Monaco />
							</div>
							<SubmitBar />
							<div className="h-2/5 min-h-0 border-t border-line">
								<TestCasesPanel />
							</div>
						</div>
					</div>
				</div>
			</EditorProvider>
		</RequireAuth>
	);
}