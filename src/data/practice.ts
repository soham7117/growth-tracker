import { safeHttpUrl } from '../lib/util'

export interface Problem {
  title: string
  url: string
  level: 'Easy' | 'Medium' | 'Hard'
}

const lc = (title: string, slug: string, level: Problem['level']): Problem => ({ title, url: `https://leetcode.com/problems/${slug}/`, level })

// Hand-picked free LeetCode problems per topic. Topics without an entry fall back to search links.
export const PRACTICE: Record<string, Problem[]> = {
  'basics:conditionals': [lc('Fizz Buzz', 'fizz-buzz', 'Easy')],
  'basics:loops': [lc('Fizz Buzz', 'fizz-buzz', 'Easy'), lc('Running Sum of 1d Array', 'running-sum-of-1d-array', 'Easy')],
  'basics:operators': [lc('Single Number', 'single-number', 'Easy'), lc('Power of Two', 'power-of-two', 'Easy')],
  'basics:working-with-strings': [lc('Reverse String', 'reverse-string', 'Easy'), lc('Valid Palindrome', 'valid-palindrome', 'Easy'), lc('Valid Anagram', 'valid-anagram', 'Easy')],
  'basics:lists': [lc('Contains Duplicate', 'contains-duplicate', 'Easy'), lc('Move Zeroes', 'move-zeroes', 'Easy'), lc('Remove Duplicates from Sorted Array', 'remove-duplicates-from-sorted-array', 'Easy')],
  'basics:sets': [lc('Contains Duplicate', 'contains-duplicate', 'Easy'), lc('Intersection of Two Arrays', 'intersection-of-two-arrays', 'Easy')],
  'basics:dictionaries': [lc('Two Sum', 'two-sum', 'Easy'), lc('Group Anagrams', 'group-anagrams', 'Medium')],
  'basics:functions-builtin-functions': [lc('Fibonacci Number', 'fibonacci-number', 'Easy')],
  'dsa:arrays-and-linked-lists': [lc('Reverse Linked List', 'reverse-linked-list', 'Easy'), lc('Merge Two Sorted Lists', 'merge-two-sorted-lists', 'Easy'), lc('Linked List Cycle', 'linked-list-cycle', 'Easy')],
  'dsa:hashmaps': [lc('Two Sum', 'two-sum', 'Easy'), lc('Group Anagrams', 'group-anagrams', 'Medium'), lc('Top K Frequent Elements', 'top-k-frequent-elements', 'Medium')],
  'dsa:heaps-stacks-and-queues': [lc('Valid Parentheses', 'valid-parentheses', 'Easy'), lc('Min Stack', 'min-stack', 'Medium'), lc('Implement Queue using Stacks', 'implement-queue-using-stacks', 'Easy'), lc('Kth Largest Element in an Array', 'kth-largest-element-in-an-array', 'Medium')],
  'dsa:binary-search-tree': [lc('Search in a Binary Search Tree', 'search-in-a-binary-search-tree', 'Easy'), lc('Validate Binary Search Tree', 'validate-binary-search-tree', 'Medium'), lc('Kth Smallest Element in a BST', 'kth-smallest-element-in-a-bst', 'Medium')],
  'dsa:recursion': [lc('Fibonacci Number', 'fibonacci-number', 'Easy'), lc('Climbing Stairs', 'climbing-stairs', 'Easy'), lc('Power of Two', 'power-of-two', 'Easy')],
  'dsa:sorting-algorithms': [lc('Sort an Array', 'sort-an-array', 'Medium'), lc('Sort Colors', 'sort-colors', 'Medium'), lc('Merge Intervals', 'merge-intervals', 'Medium')],
  'language:list-comprehensions': [lc('Squares of a Sorted Array', 'squares-of-a-sorted-array', 'Easy'), lc('Running Sum of 1d Array', 'running-sum-of-1d-array', 'Easy')],
  'language:iterators': [lc('Peeking Iterator', 'peeking-iterator', 'Medium'), lc('Flatten Nested List Iterator', 'flatten-nested-list-iterator', 'Medium')],
  'language:generator-expressions': [lc('Fibonacci Number', 'fibonacci-number', 'Easy')],
  'oop:classes': [lc('Design HashMap', 'design-hashmap', 'Easy'), lc('LRU Cache', 'lru-cache', 'Medium'), lc('Implement Trie (Prefix Tree)', 'implement-trie-prefix-tree', 'Medium')],
  'concurrency:threading': [lc('Print in Order', 'print-in-order', 'Easy'), lc('Print FooBar Alternately', 'print-foobar-alternately', 'Medium')],
  'concurrency:multiprocessing': [lc('Print in Order', 'print-in-order', 'Easy')],
  'concurrency:asynchrony': [lc('Print in Order', 'print-in-order', 'Easy')],
  'concurrency:gil': [lc('Print FooBar Alternately', 'print-foobar-alternately', 'Medium')],
}

export const SEARCH_TERMS: Record<string, string> = {
  'basics:functions-builtin-functions': 'python functions',
  'language:regular-expressions': 'regular expression',
  'language:lambdas': 'python lambda',
}

export const leetcodeSearch = (term: string) => `https://leetcode.com/problemset/?search=${encodeURIComponent(term)}`
export const gfgSearch = (term: string) => `https://www.google.com/search?q=${encodeURIComponent(`site:geeksforgeeks.org ${term}`)}`

/** Open a link in a small popup window (falls back to a new tab if popups are blocked). */
export function openPopup(url: string) {
  const safe = safeHttpUrl(url)
  if (!safe) return
  const w = Math.min(1100, window.screen.availWidth - 80)
  const h = Math.min(800, window.screen.availHeight - 80)
  const win = window.open(safe, 'practice-window', `popup=yes,width=${w},height=${h},left=60,top=40`)
  if (win) win.opener = null // the practice site must not be able to reach back into this app
  else window.open(safe, '_blank', 'noopener,noreferrer')
}
