import {Dispatch, SetStateAction, useEffect, useRef} from 'react'
import useRouter from './useRouter'
import {readInlineData} from 'relay-runtime'
import useAtmosphere from './useAtmosphere'
import findStageById from '../utils/meetings/findStageById'
import updateLocalStage from '../utils/relay/updateLocalStage'
import fromStageIdToUrl from '../utils/meetings/fromStageIdToUrl'
import graphql from 'babel-plugin-relay/macro'
import {useUpdatedSafeRoute_meeting} from '__generated__/useUpdatedSafeRoute_meeting.graphql'

const useUpdatedSafeRoute = (setSafeRoute: Dispatch<SetStateAction<boolean>>, meetingRef: any) => {
  const {history} = useRouter()
  const meeting = readInlineData<useUpdatedSafeRoute_meeting>(
    graphql`
      fragment useUpdatedSafeRoute_meeting on NewMeeting @inline {
        ...fromStageIdToUrl_meeting
        id
        localStage {
          id
        }
        localPhase {
          id
          stages {
            id
          }
        }
        facilitatorStageId
        phases {
          id
          stages {
            id
          }
        }
      }
    `,
    meetingRef
  )
  const oldMeetingRef = useRef(meeting)
  const atmosphere = useAtmosphere()
  useEffect(() => {
    const {current: oldMeeting} = oldMeetingRef
    if (meeting === oldMeeting) {
      // required. repro: enter meeting, click to team dash, go back to meeting
      setSafeRoute(true)
      return
    }
    const {id: meetingId, localStage, localPhase, facilitatorStageId, phases} = meeting
    const localStages = localPhase?.stages ?? null
    const localStageId = localStage?.id ?? null
    const oldLocalStages = oldMeeting?.localPhase?.stages ?? null
    const oldLocalStageId = oldMeeting?.localStage?.id
    oldMeetingRef.current = meeting
    // if the stage changes or the order of the stages changes, update the url
    const isNewLocalStageId = localStageId && localStageId !== oldLocalStageId
    const isUpdatedPhase = localStages !== oldLocalStages
    if (isNewLocalStageId || isUpdatedPhase) {
      if (isUpdatedPhase && !findStageById(phases, localStageId)) {
        // an item was removed and the local stage may be missing
        updateLocalStage(atmosphere, meetingId, facilitatorStageId)
      }

      const nextPathname = fromStageIdToUrl(localStageId, meeting, facilitatorStageId)
      if (nextPathname !== location.pathname) {
        history.replace(nextPathname)
        // do not set as unsafe (repro: start meeting, end, start again)
        return
      }
    }
    setSafeRoute(true)
  })
}

export default useUpdatedSafeRoute
