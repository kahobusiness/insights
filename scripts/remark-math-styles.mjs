// remark-math registers its parser before transformers run, so these are real
// math nodes, not dollar signs in code blocks or escaped currency amounts.
export default function remarkMathStyles() {
  return tree => {
    function hasMath(node) {
      return node.type === 'math' || node.type === 'inlineMath' ||
        node.children?.some(hasMath)
    }

    if (hasMath(tree)) {
      tree.children.unshift({
        type: 'mdxJsxFlowElement',
        name: 'MathStyles',
        attributes: [],
        children: []
      })
    }
  }
}
