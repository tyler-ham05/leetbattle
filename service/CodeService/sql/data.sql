-- Manual spot-check seed for local dev, independent of the full dataset import.
-- The full dataset is loaded via ../setup/dataset.py (newfacade/LeetCodeDataset on Hugging Face).
\c code_service

INSERT INTO problems (
  task_id, question_id, difficulty, tags, problem_description, starter_code, entry_point
) VALUES
(
  'two-sum',
  1,
  'Easy',
  ARRAY['Array', 'Hash Table'],
  'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
  'class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        pass',
  'Solution().twoSum'
),
(
  'valid-parentheses',
  20,
  'Easy',
  ARRAY['String', 'Stack'],
  'Given a string s containing just the characters ''('', '')'', ''{'', ''}'', ''['' and '']'', determine if the input string is valid. An input string is valid if open brackets are closed by the same type of brackets, open brackets are closed in the correct order, and every close bracket has a corresponding open bracket of the same type.',
  'class Solution:\n    def isValid(self, s: str) -> bool:\n        pass',
  'Solution().isValid'
),
(
  'best-time-to-buy-and-sell-stock',
  121,
  'Easy',
  ARRAY['Array', 'Dynamic Programming'],
  'You are given an array prices where prices[i] is the price of a given stock on the ith day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock. Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.',
  'class Solution:\n    def maxProfit(self, prices: List[int]) -> int:\n        pass',
  'Solution().maxProfit'
)
ON CONFLICT (task_id) DO NOTHING;