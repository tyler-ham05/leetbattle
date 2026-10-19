-- Manual spot-check seed for local dev, independent of the full dataset import.
-- The full dataset is loaded via ../setup/dataset.py (newfacade/LeetCodeDataset on Hugging Face).
\c code_service

INSERT INTO problems (
  task_id, question_id, difficulty, tags, problem_description, starter_code, entry_point
) VALUES (
  'two-sum',
  1,
  'Easy',
  ARRAY['Array', 'Hash Table'],
  'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
  'class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        pass',
  'Solution().twoSum'
)
ON CONFLICT (task_id) DO NOTHING;
