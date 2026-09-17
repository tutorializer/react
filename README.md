# @tutorializer/react

The React tutorial shell used by [Tutorializer](https://tutorializer.com). It
renders chapters, preloads a product in an iframe, and coordinates narrated
tour steps with the product-side `@tutorializer/tours` runtime.

The package is published as source so JSX-aware applications can import only
the components they use.

## Install from GitHub

Pin a commit so a tutorial stays reproducible:

```bash
npm install https://github.com/tutorializer/react/archive/COMMIT_SHA.tar.gz @emotion/react
```

## Minimal tutorial

```jsx
import Chapter from '@tutorializer/react/Chapter.jsx'
import PreloadedPage from '@tutorializer/react/PreloadedPage.jsx'
import { usePreloadedPageRefForCurrentChapter } from '@tutorializer/react/PreloadedPageContext.js'
import TourWithSpeech from '@tutorializer/react/TourWithSpeech.jsx'
import Tutorial from '@tutorializer/react/Tutorial.jsx'
import Tutorializer from '@tutorializer/react/Tutorializer.jsx'

const ProductTour = () => {
  const app = usePreloadedPageRefForCurrentChapter()

  return (
    <Chapter name="Create task" animation="none">
      <PreloadedPage url="/" title="Product" />
      <TourWithSpeech
        preloadedAppRef={app}
        name="create-task"
        speeches={false}
      />
    </Chapter>
  )
}

export default function CreateTaskTutorial() {
  return (
    <Tutorializer>
      <Tutorial language="en">
        <ProductTour />
      </Tutorial>
    </Tutorializer>
  )
}
```

The iframe application must initialize `@tutorializer/tours` with a matching
`create-task` entry in its `tours.json`. Pass generated speech data to
`Tutorializer` and omit `speeches={false}` when narration is available.

## License

MIT
