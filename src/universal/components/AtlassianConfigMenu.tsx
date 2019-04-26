import React from 'react'
import MenuItemWithShortcuts from 'universal/components/MenuItemWithShortcuts'
import MenuWithShortcuts from 'universal/components/MenuWithShortcuts'
import useAtmosphere from 'universal/hooks/useAtmosphere'
import RemoveAtlassianAuthMutation from 'universal/mutations/RemoveAtlassianAuthMutation'
import {IntegrationServiceEnum} from 'universal/types/graphql'
import handleOpenOAuth from 'universal/utils/handleOpenOAuth'
import {MenuMutationProps} from 'universal/utils/relay/withMutationProps'

interface Props {
  closePortal: () => void
  mutationProps: MenuMutationProps
  teamId: string
}

const AtlassianConfigMenu = (props: Props) => {
  const {closePortal, mutationProps, teamId} = props
  const {onError, onCompleted, submitMutation, submitting} = mutationProps
  const atmosphere = useAtmosphere()
  const openOAuth = handleOpenOAuth({
    name: IntegrationServiceEnum.atlassian,
    atmosphere,
    teamId,
    ...mutationProps
  })

  const removeAtlassian = () => {
    if (submitting) return
    submitMutation()
    RemoveAtlassianAuthMutation(atmosphere, {teamId}, {onError, onCompleted})
  }
  return (
    <MenuWithShortcuts ariaLabel={'Configure your Atlassian integration'} closePortal={closePortal}>
      <MenuItemWithShortcuts label='Refresh token' onClick={openOAuth} />
      <MenuItemWithShortcuts label='Remove Atlassian' onClick={removeAtlassian} />
    </MenuWithShortcuts>
  )
}

export default AtlassianConfigMenu